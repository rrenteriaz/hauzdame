/**
 * Script de verificación: ChatParticipant teamMembershipId backfill
 * 
 * Verifica el estado del backfill de teamMembershipId en ChatParticipant.
 * 
 * Ejecutar: npx tsx scripts/verify-chat-participant-membership.ts
 */

import prisma from "../lib/prisma";

async function verify() {
  console.log("\n=== VERIFICACIÓN: ChatParticipant teamMembershipId ===\n");

  // 1. Participantes con thread.teamId pero sin teamMembershipId (debería ser 0 o muy bajo)
  const participantsWithoutMembership = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM "ChatParticipant" cp
    INNER JOIN "ChatThread" ct ON cp."threadId" = ct.id
    WHERE ct."teamId" IS NOT NULL
      AND cp."teamMembershipId" IS NULL
      AND cp."leftAt" IS NULL
  `;

  const countWithout = Number(participantsWithoutMembership[0]?.count || 0);
  console.log(`1. Participantes activos con thread.teamId pero sin teamMembershipId: ${countWithout}`);
  if (countWithout > 0) {
    console.log("   ⚠️  Algunos participantes no tienen teamMembershipId set");
    console.log("   Esto puede ser normal si:");
    console.log("   - El usuario no tiene TeamMembership ACTIVE en ese equipo");
    console.log("   - Son registros legacy anteriores a la migración");
  } else {
    console.log("   ✅ Todos los participantes con thread.teamId tienen teamMembershipId");
  }

  // 2. Participantes con teamMembershipId (debería ser > 0 si hay threads con teamId)
  const participantsWithMembership = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM "ChatParticipant"
    WHERE "teamMembershipId" IS NOT NULL
      AND "leftAt" IS NULL
  `;

  const countWith = Number(participantsWithMembership[0]?.count || 0);
  console.log(`\n2. Participantes activos con teamMembershipId set: ${countWith}`);

  // 3. Verificar integridad: teamMembershipId debe apuntar a membership válida
  const invalidMemberships = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM "ChatParticipant" cp
    WHERE cp."teamMembershipId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "TeamMembership" tm
        WHERE tm.id = cp."teamMembershipId"
          AND tm."status" = 'ACTIVE'
      )
  `;

  const countInvalid = Number(invalidMemberships[0]?.count || 0);
  console.log(`\n3. Participantes con teamMembershipId inválido o inactivo: ${countInvalid}`);
  if (countInvalid > 0) {
    console.log("   ⚠️  Algunos participantes tienen teamMembershipId que no existe o no está ACTIVE");
  } else {
    console.log("   ✅ Todos los teamMembershipId son válidos y ACTIVE");
  }

  // 4. Verificar coherencia: si thread.teamId existe, teamMembershipId.teamId debe coincidir
  const mismatchedTeams = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM "ChatParticipant" cp
    INNER JOIN "ChatThread" ct ON cp."threadId" = ct.id
    INNER JOIN "TeamMembership" tm ON cp."teamMembershipId" = tm.id
    WHERE ct."teamId" IS NOT NULL
      AND cp."teamMembershipId" IS NOT NULL
      AND ct."teamId" != tm."teamId"
  `;

  const countMismatched = Number(mismatchedTeams[0]?.count || 0);
  console.log(`\n4. Participantes con teamMembershipId de equipo diferente al thread.teamId: ${countMismatched}`);
  if (countMismatched > 0) {
    console.log("   ❌ ERROR: Inconsistencia detectada");
  } else {
    console.log("   ✅ Todos los teamMembershipId coinciden con thread.teamId");
  }

  // 5. Resumen de threads con teamId
  const threadsWithTeam = await prisma.chatThread.count({
    where: {
      teamId: { not: null },
    },
  });

  console.log(`\n5. Total de threads con teamId: ${threadsWithTeam}`);

  // Resumen final
  console.log("\n=== RESUMEN ===");
  console.log(`Threads con teamId: ${threadsWithTeam}`);
  console.log(`Participantes con teamMembershipId: ${countWith}`);
  console.log(`Participantes sin teamMembershipId (con thread.teamId): ${countWithout}`);
  console.log(`Integridad: ${countInvalid === 0 && countMismatched === 0 ? "✅ OK" : "⚠️  Revisar"}`);
  console.log("");
}

verify()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

