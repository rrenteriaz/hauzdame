// scripts/import-dev-data.ts
import fs from "node:fs";
import prisma from "../lib/prisma";

function toDate(value: any) {
  if (!value) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d;
}

async function main() {
  if (!fs.existsSync("dev-export.json")) {
    throw new Error("No se encontró dev-export.json en la raíz del repo.");
  }

  const raw = fs.readFileSync("dev-export.json", "utf-8");
  const data = JSON.parse(raw);

  const tenants = data.tenants ?? [];
  const users = data.users ?? [];
  const properties = data.properties ?? [];
  const reservations = data.reservations ?? [];

  console.log("📥 Importando datos de desarrollo...");
  console.log(
    `   Tenants: ${tenants.length}, Users: ${users.length}, Properties: ${properties.length}, Reservations: ${reservations.length}`
  );

  // ===== TENANTS =====
  let upsertedTenants = 0;
  for (const t of tenants) {
    await prisma.tenant.upsert({
      where: { id: t.id },
      update: {
        ...t,
        createdAt: toDate(t.createdAt),
        updatedAt: toDate(t.updatedAt),
      },
      create: {
        ...t,
        createdAt: toDate(t.createdAt),
        updatedAt: toDate(t.updatedAt),
      },
    });
    upsertedTenants++;
  }

  // Necesario: User.tenantId es NOT NULL en tu DB real
  const defaultTenantId = tenants?.[0]?.id;
  if (!defaultTenantId) {
    throw new Error(
      "No hay tenants en el export. No puedo asignar tenantId default a users."
    );
  }

  // ===== USERS =====
  let upsertedUsers = 0;
  for (const u of users) {
    const email =
      typeof u.email === "string" && u.email.trim().length > 0
        ? u.email.trim().toLowerCase()
        : `dev+${u.id}@hausdame.local`;

    const role =
      typeof u.role === "string" && u.role.length > 0 ? u.role : "OWNER";

    // TenantId obligatorio: si viene null, usamos defaultTenantId
    const tenantId = u.tenantId ?? defaultTenantId;

    // NO mandamos createdAt/updatedAt para evitar problemas de defaults / nulls
    // SOLO columnas reales de la DB (según tu inspect-user-columns)
    const safeUser = {
      id: u.id,
      tenantId,
      email,
      name: u.name ?? null,
      hashedPassword: u.hashedPassword ?? null,
      role,
    };

    // Upsert por email (es unique y más estable que id en escenarios raros)
    // Como Prisma upsert requiere "where unique", usamos email.
    // PERO en create queremos preservar el id exportado, entonces va incluido.
    await prisma.user.upsert({
        where: { email: safeUser.email },
        update: {
          tenantId: safeUser.tenantId,
          name: safeUser.name,
          hashedPassword: safeUser.hashedPassword,
          role: safeUser.role,
        },
        create: safeUser,
      
        // 🔑 CRÍTICO: evita que Prisma haga RETURNING de columnas que tu DB no tiene
        select: { id: true, email: true },
      });
      

    upsertedUsers++;
  }

  // ===== OWNER FALLBACKS (compatibilidad ownerId -> userId) =====
  const ownerByTenant = new Map<string, string>();
  for (const u of users) {
    if (u?.tenantId && u?.role === "OWNER" && !ownerByTenant.has(u.tenantId)) {
      ownerByTenant.set(u.tenantId, u.id);
    }
  }
  if (!ownerByTenant.has(defaultTenantId)) {
    const fallbackUser = users.find((u: any) => u?.tenantId === defaultTenantId);
    if (fallbackUser?.id) ownerByTenant.set(defaultTenantId, fallbackUser.id);
  }

// ===== PROPERTIES =====
let upsertedProperties = 0;
for (const p of properties) {
  // 🔒 Solo columnas que sabemos que existen en tu Property “viejo”
  // (si después falta alguna, la agregamos de a una)
  const resolvedUserId =
    p.userId ??
    p.ownerId ??
    ownerByTenant.get(p.tenantId) ??
    ownerByTenant.get(defaultTenantId);

  if (!resolvedUserId) {
    throw new Error(
      `Property sin userId/ownerId y sin owner fallback (propertyId=${p.id || "n/a"})`
    );
  }

  const safeProperty = {
    id: p.id,
    tenantId: p.tenantId,
    userId: resolvedUserId,
    name: p.name,
    shortName: p.shortName ?? null,
    address: p.address ?? null,
    notes: p.notes ?? null,
    icalUrl: p.icalUrl ?? null,
    timeZone: p.timeZone ?? null,
    checkInTime: p.checkInTime ?? null,
    checkOutTime: p.checkOutTime ?? null,
    groupName: p.groupName ?? null,
    notificationEmail: p.notificationEmail ?? null,
    isActive: p.isActive ?? true,
  };

  await (prisma as any).property.upsert({
    where: { id: safeProperty.id },
    update: safeProperty,
    create: safeProperty,

    // 🔑 evita RETURNING de columnas nuevas (coverMediaId, latitude, etc.)
    select: { id: true },
  });

  upsertedProperties++;
}


  // ===== RESERVATIONS =====
  let upsertedReservations = 0;
  for (const r of reservations) {
    await prisma.reservation.upsert({
      where: { id: r.id },
      update: {
        ...r,
        startDate: toDate(r.startDate),
        endDate: toDate(r.endDate),
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt),
      },
      create: {
        ...r,
        startDate: toDate(r.startDate),
        endDate: toDate(r.endDate),
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt),
      },
    });
    upsertedReservations++;
  }

  console.log("✅ Importación completada:");
  console.log(`   Tenants upserted: ${upsertedTenants}`);
  console.log(`   Users upserted: ${upsertedUsers}`);
  console.log(`   Properties upserted: ${upsertedProperties}`);
  console.log(`   Reservations upserted: ${upsertedReservations}`);
}

main()
  .catch((e) => {
    console.error("❌ Error al importar:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
