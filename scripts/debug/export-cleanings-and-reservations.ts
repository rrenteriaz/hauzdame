import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import prisma from "@/lib/prisma";

/**
 * Exporta Cleaning (primero) y luego Reservation (después).
 * - Solo lectura.
 * - Paginación por id para soportar tablas grandes.
 *
 * Uso:
 *   npx tsx scripts/debug/export-cleanings-and-reservations.ts
 *
 * Flags opcionales:
 *   --include-dates        -> incluye campos de schedule/fechas en Cleaning
 *   --reservation-extra    -> incluye campos extra comunes en Reservation (según opciones que Prisma mostró)
 *
 * Variables opcionales (env):
 *   EXPORT_DIR=./tmp/exports
 *   TENANT_ID=...
 *   PROPERTY_ID=...
 *   LIMIT=0              # 0 = sin límite (default), >0 limita filas por tabla
 *   PAGE_SIZE=1000       # default 1000
 *   RESERVATIONS_MODE=linked  # "linked" (default) | "all"
 */

type Id = string;
type ReservationRow = { id: Id } & Record<string, unknown>;

function envInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function buildCleaningSelect(includeDates: boolean) {
  const baseSelect: any = {
    id: true,
    tenantId: true,
    propertyId: true,
    reservationId: true,

    status: true,
    assignmentStatus: true,
    attentionReason: true,

    teamId: true,
    assignedMembershipId: true,
    assignedToId: true,
    assignedMemberId: true,
    assignedTeamMemberId: true,

    notes: true,

    createdAt: true,
    updatedAt: true,
  };

  if (!includeDates) return baseSelect;

  // Campos que Prisma mostró como disponibles en TU modelo Cleaning
  const dateAndScheduleFields = {
    scheduledDate: true,
    startedAt: true,
    completedAt: true,

    needsAttention: true,

    scheduledAtOriginal: true,
    scheduledAtPlanned: true,

    isScheduleOverridden: true,
    scheduleOverriddenAt: true,
  };

  return { ...baseSelect, ...dateAndScheduleFields };
}

function buildReservationSelect(extra: boolean) {
  // Base: SIN platform / platformReservationId (no existen en tu modelo)
  const baseSelect = {
    id: true,
    tenantId: true,
    propertyId: true,

    status: true,

    startDate: true,
    endDate: true,

    guestName: true,
    guestEmail: true,
    guestsCount: true,

    notes: true,

    createdAt: true,
    updatedAt: true,
  } as const;

  if (!extra) return baseSelect;

  // Campos extra que Prisma mostró como disponibles (en tu error):
  const extraFields = {
    source: true,
    calendarUid: true,
    reservationCodeCalendar: true,

    guestPhoneLast4: true,
    confirmationCodeEmail: true,
    guestMessage: true,

    guestsAdult: true,
    guestsChildren: true,
    guestsInfants: true,
    guestsPets: true,

    pricingNightly: true,
    pricingCleaningFee: true,
    pricingPetFee: true,
    pricingHostServiceFee: true,
    pricingHostPayout: true,
    pricingCurrency: true,
  };

  return { ...baseSelect, ...extraFields };
}

async function exportCleanings(opts: {
  outFile: string;
  pageSize: number;
  limit: number; // 0 = unlimited
  tenantId?: string;
  propertyId?: string;
  includeDates: boolean;
}) {
  const stream = fs.createWriteStream(opts.outFile, { encoding: "utf8" });
  let lastId: Id | undefined = undefined;
  let total = 0;
  const reservationIds = new Set<Id>();

  console.log("▶️ Exporting Cleaning ->", opts.outFile);

  let select = buildCleaningSelect(opts.includeDates);

  while (true) {
    const take = opts.pageSize;

    const where: any = {
      ...(opts.tenantId ? { tenantId: opts.tenantId } : {}),
      ...(opts.propertyId ? { propertyId: opts.propertyId } : {}),
      ...(lastId ? { id: { gt: lastId } } : {}),
    };

    let rows: any[] = [];
    try {
      rows = await prisma.cleaning.findMany({
        where,
        orderBy: { id: "asc" },
        take,
        select,
      });
    } catch (err: any) {
      if (opts.includeDates) {
        console.log("⚠️ Cleaning query failed with include-dates. Retrying with base select only.");
        select = buildCleaningSelect(false);
        rows = await prisma.cleaning.findMany({
          where,
          orderBy: { id: "asc" },
          take,
          select,
        });
      } else {
        throw err;
      }
    }

    if (rows.length === 0) break;

    for (const r of rows) {
      stream.write(JSON.stringify(r) + "\n");
      total++;

      if (r.reservationId) reservationIds.add(r.reservationId);

      if (opts.limit > 0 && total >= opts.limit) {
        console.log(`⏹️ Limit reached for Cleaning: ${opts.limit}`);
        stream.end();
        return { total, reservationIds };
      }
    }

    lastId = rows[rows.length - 1].id;
    if (rows.length < take) break;
  }

  stream.end();
  console.log(`✅ Cleaning exported: ${total} rows`);
  return { total, reservationIds };
}

async function exportReservations(opts: {
  outFile: string;
  pageSize: number;
  limit: number; // 0 = unlimited
  mode: "linked" | "all";
  linkedReservationIds?: Set<Id>;
  tenantId?: string;
  propertyId?: string;
  reservationExtra: boolean;
}) {
  const stream = fs.createWriteStream(opts.outFile, { encoding: "utf8" });
  let lastId: Id | undefined = undefined;
  let total = 0;

  console.log("▶️ Exporting Reservation ->", opts.outFile, `(mode=${opts.mode})`);

  if (opts.mode === "linked" && (!opts.linkedReservationIds || opts.linkedReservationIds.size === 0)) {
    console.log("ℹ️ No linked reservationIds found from cleanings. Reservation export skipped (0 rows).");
    stream.end();
    return { total };
  }

  const select = buildReservationSelect(opts.reservationExtra);

  if (opts.mode === "linked") {
    const ids = Array.from(opts.linkedReservationIds!);
    const chunkSize = 500;

    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);

      const where: any = {
        id: { in: chunk },
        ...(opts.tenantId ? { tenantId: opts.tenantId } : {}),
        ...(opts.propertyId ? { propertyId: opts.propertyId } : {}),
      };

      const rows = (await prisma.reservation.findMany({
        where,
        select,
      })) as ReservationRow[];

      for (const r of rows) {
        stream.write(JSON.stringify(r) + "\n");
        total++;

        if (opts.limit > 0 && total >= opts.limit) {
          console.log(`⏹️ Limit reached for Reservation: ${opts.limit}`);
          stream.end();
          return { total };
        }
      }
    }

    stream.end();
    console.log(`✅ Reservation exported (linked): ${total} rows`);
    return { total };
  }

  while (true) {
    const take = opts.pageSize;

    const where: any = {
      ...(opts.tenantId ? { tenantId: opts.tenantId } : {}),
      ...(opts.propertyId ? { propertyId: opts.propertyId } : {}),
      ...(lastId ? { id: { gt: lastId } } : {}),
    };

    const rows = (await prisma.reservation.findMany({
      where,
      orderBy: { id: "asc" },
      take,
      select,
    })) as ReservationRow[];

    if (rows.length === 0) break;

    for (const r of rows) {
      stream.write(JSON.stringify(r) + "\n");
      total++;

      if (opts.limit > 0 && total >= opts.limit) {
        console.log(`⏹️ Limit reached for Reservation: ${opts.limit}`);
        stream.end();
        return { total };
      }
    }

    lastId = rows[rows.length - 1].id;
    if (rows.length < take) break;
  }

  stream.end();
  console.log(`✅ Reservation exported (all): ${total} rows`);
  return { total };
}

async function main() {
  const exportDir = process.env.EXPORT_DIR || path.join(process.cwd(), "tmp", "exports");
  const tenantId = process.env.TENANT_ID || undefined;
  const propertyId = process.env.PROPERTY_ID || undefined;

  const limit = envInt("LIMIT", 0);
  const pageSize = envInt("PAGE_SIZE", 1000);

  const modeRaw = (process.env.RESERVATIONS_MODE || "linked").toLowerCase();
  const mode = (modeRaw === "all" ? "all" : "linked") as "linked" | "all";

  const includeDates = hasFlag("--include-dates");
  const reservationExtra = hasFlag("--reservation-extra");

  ensureDir(exportDir);

  const cleaningsFile = path.join(exportDir, `cleanings_${Date.now()}.jsonl`);
  const reservationsFile = path.join(exportDir, `reservations_${Date.now()}.jsonl`);

  console.log("ℹ️ Filters:", { tenantId, propertyId, limit, pageSize, mode, includeDates, reservationExtra, exportDir });

  const { total: cleaningsTotal, reservationIds } = await exportCleanings({
    outFile: cleaningsFile,
    pageSize,
    limit,
    tenantId,
    propertyId,
    includeDates,
  });

  await exportReservations({
    outFile: reservationsFile,
    pageSize,
    limit,
    mode,
    linkedReservationIds: reservationIds,
    tenantId,
    propertyId,
    reservationExtra,
  });

  console.log("\n✅ DONE");
  console.log("Cleaning file:", cleaningsFile, `(${cleaningsTotal} rows)`);
  console.log("Reservation file:", reservationsFile);
}

main()
  .catch((e) => {
    console.error("❌ Export failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
