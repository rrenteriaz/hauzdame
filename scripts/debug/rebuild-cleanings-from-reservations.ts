import "dotenv/config";
import prisma from "@/lib/prisma";

/**
 * Rebuild de Cleaning basado en Reservation (canon UX):
 * - Solo Reservation.status === CONFIRMED genera Cleaning
 * - BLOCKED / CANCELLED NO generan Cleaning
 * - scheduledDate debe ser el "checkout day" (Reservation.endDate, DTEND exclusivo en iCal)
 *
 * Modo:
 *  - dry-run (default): solo reporta
 *  - --apply: ejecuta deletes/creates
 *
 * Filtros opcionales:
 *  --tenant=<id>
 *  --property=<id>
 */

function getArgValue(flag: string) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1) return process.argv[idx + 1] || null;
  const withEq = process.argv.find((a) => a.startsWith(flag + "="));
  if (!withEq) return null;
  return withEq.split("=").slice(1).join("=") || null;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function dayKey(d: Date | string | null | undefined) {
  if (!d) return null;
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return null;
  // clave por día en UTC (sirve bien si tus dates están normalizadas a medianoche local -> 06:00Z)
  return dt.toISOString().slice(0, 10);
}

async function main() {
  const apply = hasFlag("--apply");
  const tenantId = getArgValue("--tenant");
  const propertyId = getArgValue("--property");

  console.log("ℹ️ Options:", { apply, tenantId, propertyId });

  const whereReservation: any = {};
  if (tenantId) whereReservation.tenantId = tenantId;
  if (propertyId) whereReservation.propertyId = propertyId;

  const whereCleaning: any = {};
  if (tenantId) whereCleaning.tenantId = tenantId;
  if (propertyId) whereCleaning.propertyId = propertyId;

  // 1) Cargar reservations relevantes
  const reservations = await prisma.reservation.findMany({
    where: whereReservation,
    select: {
      id: true,
      tenantId: true,
      propertyId: true,
      status: true,
      startDate: true,
      endDate: true,
      calendarUid: true,
      reservationCodeCalendar: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  const resById = new Map(reservations.map((r) => [r.id, r]));
  const confirmed = reservations.filter((r) => r.status === "CONFIRMED");

  console.log("📌 Reservations loaded:", {
    total: reservations.length,
    confirmed: confirmed.length,
    cancelled: reservations.filter((r) => r.status === "CANCELLED").length,
    blocked: reservations.filter((r) => r.status === "BLOCKED").length,
  });

  // 2) Cargar cleanings actuales (solo columnas necesarias)
  const cleanings = await prisma.cleaning.findMany({
    where: whereCleaning,
    select: {
      id: true,
      tenantId: true,
      propertyId: true,
      reservationId: true,
      scheduledDate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      isScheduleOverridden: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("🧹 Cleanings loaded:", { total: cleanings.length });

  // 3) Detectar acciones
  const deletes: { id: string; reason: string }[] = [];
  const creates: { tenantId: string; propertyId: string; reservationId: string; scheduledDate: Date }[] = [];

  // Agrupar cleanings por reservationId
  const cleaningsByReservationId = new Map<string, typeof cleanings>();
  for (const c of cleanings) {
    if (!c.reservationId) continue;
    const list = cleaningsByReservationId.get(c.reservationId) ?? [];
    list.push(c);
    cleaningsByReservationId.set(c.reservationId, list);
  }

  // Regla: para cada cleaning con reservationId, validar existencia + status + fecha
  for (const c of cleanings) {
    if (!c.reservationId) {
      // si son “manuales”, no las tocamos por default
      continue;
    }

    const r = resById.get(c.reservationId);

    if (!r) {
      deletes.push({ id: c.id, reason: "RESERVATION_NOT_FOUND" });
      continue;
    }

    if (r.status !== "CONFIRMED") {
      deletes.push({ id: c.id, reason: `RESERVATION_STATUS_${r.status}` });
      continue;
    }

    // duplicados: si hay >1 cleaning por reservationId, dejamos solo la “mejor” (matching por día)
    const siblings = cleaningsByReservationId.get(c.reservationId) ?? [];
    if (siblings.length > 1) {
      const targetDay = dayKey(r.endDate);
      const matching = siblings.filter((x) => dayKey(x.scheduledDate) === targetDay);

      // criterio: preferimos el que matchea por día; si hay varios, el más antiguo
      const keep =
        (matching.length > 0 ? matching : siblings)
          .slice()
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

      if (c.id !== keep.id) {
        deletes.push({ id: c.id, reason: "DUPLICATE_FOR_RESERVATION" });
        continue;
      }
    }

    // validar fecha (por día)
    const expectedDay = dayKey(r.endDate);
    const actualDay = dayKey(c.scheduledDate);

    if (!expectedDay || !actualDay) {
      // si no podemos comparar, no tocamos (pero reportamos)
      continue;
    }

    if (expectedDay !== actualDay) {
      // si el usuario sobreescribió schedule, no lo borramos automáticamente
      if (c.isScheduleOverridden) {
        // lo dejamos, pero lo reportamos
        continue;
      }
      deletes.push({ id: c.id, reason: `WRONG_SCHEDULED_DAY expected=${expectedDay} actual=${actualDay}` });
      continue;
    }
  }

  // Crear cleanings faltantes para CONFIRMED
  const existingReservationIds = new Set(
    cleanings.filter((c) => c.reservationId).map((c) => c.reservationId as string)
  );

  for (const r of confirmed) {
    if (existingReservationIds.has(r.id)) continue;

    // scheduledDate = endDate (checkout day)
    // OJO: tu UX calcula scheduledAtOriginal con endDate + checkOutTime,
    // pero aquí dejamos scheduledDate en el día de salida (como ya está en tus datos).
    creates.push({
      tenantId: r.tenantId,
      propertyId: r.propertyId,
      reservationId: r.id,
      scheduledDate: new Date(r.endDate),
    });
  }

  // 4) Reporte
  console.log("\n=== PLAN ===");
  console.log("Deletes:", deletes.length);
  console.log("Creates:", creates.length);

  console.log("\nTop 20 deletes:");
  for (const row of deletes.slice(0, 20)) console.log(row);

  console.log("\nTop 20 creates:");
  for (const row of creates.slice(0, 20)) {
    console.log({
      reservationId: row.reservationId,
      propertyId: row.propertyId,
      scheduledDay: dayKey(row.scheduledDate),
    });
  }

  if (!apply) {
    console.log("\nDRY-RUN ✅ (no changes). Run with --apply to execute.");
    return;
  }

  console.log("\n=== APPLY ===");

  // 5) Ejecutar deletes (por lotes)
  const deleteIds = Array.from(new Set(deletes.map((d) => d.id)));
  if (deleteIds.length > 0) {
    const chunkSize = 200;
    for (let i = 0; i < deleteIds.length; i += chunkSize) {
      const chunk = deleteIds.slice(i, i + chunkSize);
      const res = await prisma.cleaning.deleteMany({ where: { id: { in: chunk } } });
      console.log("deleted chunk:", { count: res.count });
    }
  }

  // 6) Ejecutar creates (por lotes)
  if (creates.length > 0) {
    // createMany no permite nested, pero aquí es directo
    const chunkSize = 200;
    for (let i = 0; i < creates.length; i += chunkSize) {
      const chunk = creates.slice(i, i + chunkSize);
      const res = await prisma.cleaning.createMany({
        data: chunk.map((c) => ({
          tenantId: c.tenantId,
          propertyId: c.propertyId,
          reservationId: c.reservationId,
          scheduledDate: c.scheduledDate,
          status: "PENDING",
          assignmentStatus: "OPEN",
          needsAttention: false,
          isScheduleOverridden: false,
        })),
      });
      console.log("created chunk:", { count: res.count });
    }
  }

  console.log("\nAPPLY ✅ done.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
