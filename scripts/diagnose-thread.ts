// scripts/diagnose-thread.ts
// Script de diagnóstico para thread cross-tenant
// Ejecutar: npx tsx scripts/diagnose-thread.ts qabla8wg0tb1y1vmcc8f6fgm

import prisma from "../lib/prisma";

const threadId = process.argv[2] || "qabla8wg0tb1y1vmcc8f6fgm";

async function diagnose() {
  console.log(`\n=== DIAGNÓSTICO THREAD: ${threadId} ===\n`);

  // 1. Obtener thread
  const thread = await (prisma as any).chatThread.findUnique({
    where: { id: threadId },
    include: {
      property: {
        select: {
          id: true,
          name: true,
          userId: true,
          tenantId: true,
          admins: {
            select: { userId: true },
          },
        },
      },
      participants: {
        where: { leftAt: null },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              tenantId: true,
            },
          },
        },
      },
    },
  });

  if (!thread) {
    console.log("❌ Thread NO encontrado");
    return;
  }

  console.log("📋 CHAT THREAD:");
  console.log(`  id: ${thread.id}`);
  console.log(`  tenantId: ${thread.tenantId}`);
  console.log(`  propertyId: ${thread.propertyId}`);
  console.log(`  property.name: ${thread.property?.name || "N/A"}`);
  console.log(`  property.userId: ${thread.property?.userId || "N/A"}`);
  console.log(`  property.tenantId: ${thread.property?.tenantId || "N/A"}`);

  console.log("\n👥 PARTICIPANTS (leftAt = null):");
  if (thread.participants.length === 0) {
    console.log("  ⚠️  NO HAY PARTICIPANTS");
  } else {
    thread.participants.forEach((p: any, i: number) => {
      console.log(`  ${i + 1}. userId: ${p.userId}`);
      console.log(`     user.id: ${p.user?.id}`);
      console.log(`     user.email: ${p.user?.email || "N/A"}`);
      console.log(`     user.name: ${p.user?.name || "N/A"}`);
      console.log(`     user.role: ${p.user?.role || "N/A"}`);
      console.log(`     user.tenantId: ${p.user?.tenantId || "N/A"}`);
      console.log("");
    });
  }

  // 2. Obtener owner de la propiedad
  if (thread.property?.userId) {
    const owner = await prisma.user.findUnique({
      where: { id: thread.property.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
      },
    });

    console.log("🏠 PROPERTY OWNER:");
    if (owner) {
      console.log(`  id: ${owner.id}`);
      console.log(`  email: ${owner.email}`);
      console.log(`  name: ${owner.name || "N/A"}`);
      console.log(`  role: ${owner.role}`);
      console.log(`  tenantId: ${owner.tenantId}`);
      
      const ownerIsParticipant = thread.participants.some(
        (p: any) => p.userId === owner.id
      );
      console.log(`  ⚠️  ¿Está en participants?: ${ownerIsParticipant ? "✅ SÍ" : "❌ NO"}`);
    } else {
      console.log("  ❌ Owner NO encontrado");
    }
  }

  // 3. Obtener todos los users con role CLEANER en cualquier tenant
  const allCleaners = await prisma.user.findMany({
    where: { role: "CLEANER" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
    },
  });

  console.log("\n🧹 CLEANERS EN PARTICIPANTS:");
  const cleanerParticipants = thread.participants.filter(
    (p: any) => p.user?.role === "CLEANER"
  );
  if (cleanerParticipants.length === 0) {
    console.log("  ⚠️  NO HAY CLEANERS EN PARTICIPANTS");
  } else {
    cleanerParticipants.forEach((p: any) => {
      console.log(`  - ${p.user?.email} (${p.user?.id}, tenant: ${p.user?.tenantId})`);
    });
  }

  // 4. Resumen
  console.log("\n📊 RESUMEN:");
  console.log(`  Thread tenantId: ${thread.tenantId}`);
  console.log(`  Property tenantId: ${thread.property?.tenantId || "N/A"}`);
  console.log(`  Participants count: ${thread.participants.length}`);
  console.log(`  Owner en participants: ${thread.property?.userId ? thread.participants.some((p: any) => p.userId === thread.property.userId) : "N/A"}`);
  
  const participantTenantIds = new Set(
    thread.participants.map((p: any) => p.user?.tenantId).filter(Boolean)
  );
  console.log(`  TenantIds únicos en participants: ${Array.from(participantTenantIds).join(", ")}`);
  console.log(`  ¿Cross-tenant?: ${participantTenantIds.size > 1 ? "✅ SÍ" : "❌ NO"}`);

  console.log("\n=== FIN DIAGNÓSTICO ===\n");
}

diagnose()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

