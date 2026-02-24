// scripts/debug/diagnose-licha-teamid-mismatch.ts
// Script de diagnóstico para identificar el teamId real cuando hay IDs similares
// Compara TeamMembership vs WorkGroupExecutor para determinar cuál es el team correcto

import "dotenv/config";
import prisma from "@/lib/prisma";

// Defaults
const DEFAULT_USER_EMAIL = "cleaner2@hausdame.test";
const DEFAULT_WORK_GROUP_ID = "cmkre0wux0000q8o7ih725syw";
const DEFAULT_TEAM_ID_A = "cmkre2t190004q8o7xlms3h83"; // t19...
const DEFAULT_TEAM_ID_B = "cmkre2tl90004q8o7xlms3h83"; // tl9...

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let userEmail = DEFAULT_USER_EMAIL;
  let workGroupId = DEFAULT_WORK_GROUP_ID;
  let teamIdA = DEFAULT_TEAM_ID_A;
  let teamIdB = DEFAULT_TEAM_ID_B;

  for (const arg of args) {
    if (arg.startsWith("--userEmail=")) {
      userEmail = arg.split("=")[1];
    } else if (arg.startsWith("--workGroupId=")) {
      workGroupId = arg.split("=")[1];
    } else if (arg.startsWith("--teamIdA=")) {
      teamIdA = arg.split("=")[1];
    } else if (arg.startsWith("--teamIdB=")) {
      teamIdB = arg.split("=")[1];
    }
  }

  return { userEmail, workGroupId, teamIdA, teamIdB };
}

async function main() {
  const { userEmail, workGroupId, teamIdA, teamIdB } = parseArgs();

  console.log("=".repeat(80));
  console.log("DIAGNÓSTICO: TeamId Mismatch - TeamMembership vs WorkGroupExecutor");
  console.log("=".repeat(80));
  console.log();
  console.log(`User Email: ${userEmail}`);
  console.log(`WorkGroup ID: ${workGroupId}`);
  console.log(`Team ID A: ${teamIdA}`);
  console.log(`Team ID B: ${teamIdB}`);
  console.log();

  // PASO 1: Buscar User
  console.log("PASO 1: Buscando User...");
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
    },
  });

  if (!user) {
    console.error(`❌ User con email=${userEmail} NO EXISTE`);
    process.exit(1);
  }

  console.log(`✅ User encontrado:`);
  console.log(`   - ID: ${user.id}`);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Name: ${user.name || "N/A"}`);
  console.log(`   - Role: ${user.role}`);
  console.log(`   - tenantId: ${user.tenantId || "NULL"}`);
  console.log();

  // PASO 2: TeamMembership ACTIVE del user
  console.log("PASO 2: TeamMembership ACTIVE del user...");
  const memberships = await prisma.teamMembership.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    select: {
      id: true,
      teamId: true,
      role: true,
      status: true,
      Team: {
        select: {
          id: true,
          name: true,
          tenantId: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`📊 TeamMemberships ACTIVE encontradas: ${memberships.length}`);
  if (memberships.length === 0) {
    console.warn("   ⚠️  NO se encontraron TeamMemberships ACTIVE para este user");
  } else {
    memberships.forEach((membership, idx) => {
      console.log(`   [${idx + 1}]`);
      console.log(`      - Membership ID: ${membership.id}`);
      console.log(`      - teamId: ${membership.teamId}`);
      console.log(`      - role: ${membership.role}`);
      console.log(`      - status: ${membership.status}`);
      console.log(`      - Team:`);
      console.log(`         * ID: ${membership.Team.id}`);
      console.log(`         * Name: ${membership.Team.name}`);
      console.log(`         * tenantId: ${membership.Team.tenantId}`);
      console.log(`         * status: ${membership.Team.status}`);
      console.log();
    });
  }

  const userTeamIds = memberships.map((m) => m.teamId);
  console.log(`   TeamIds a los que pertenece el user: [${userTeamIds.join(", ")}]`);
  console.log();

  // PASO 3: Verificar TeamIdA y TeamIdB
  console.log("PASO 3: Verificando TeamIdA y TeamIdB...");

  // TeamIdA
  console.log(`   TeamIdA: ${teamIdA}`);
  const teamA = await prisma.team.findUnique({
    where: { id: teamIdA },
    select: {
      id: true,
      name: true,
      tenantId: true,
      status: true,
    },
  });

  if (!teamA) {
    console.warn(`   ⚠️  TeamIdA NO EXISTE en la tabla Team`);
  } else {
    console.log(`   ✅ TeamIdA existe:`);
    console.log(`      - ID: ${teamA.id}`);
    console.log(`      - Name: ${teamA.name}`);
    console.log(`      - tenantId: ${teamA.tenantId}`);
    console.log(`      - status: ${teamA.status}`);

    const membershipsCountA = await prisma.teamMembership.count({
      where: {
        teamId: teamIdA,
        status: "ACTIVE",
      },
    });
    console.log(`      - TeamMemberships ACTIVE: ${membershipsCountA}`);
    console.log();
  }

  // TeamIdB
  console.log(`   TeamIdB: ${teamIdB}`);
  const teamB = await prisma.team.findUnique({
    where: { id: teamIdB },
    select: {
      id: true,
      name: true,
      tenantId: true,
      status: true,
    },
  });

  if (!teamB) {
    console.warn(`   ⚠️  TeamIdB NO EXISTE en la tabla Team`);
  } else {
    console.log(`   ✅ TeamIdB existe:`);
    console.log(`      - ID: ${teamB.id}`);
    console.log(`      - Name: ${teamB.name}`);
    console.log(`      - tenantId: ${teamB.tenantId}`);
    console.log(`      - status: ${teamB.status}`);

    const membershipsCountB = await prisma.teamMembership.count({
      where: {
        teamId: teamIdB,
        status: "ACTIVE",
      },
    });
    console.log(`      - TeamMemberships ACTIVE: ${membershipsCountB}`);
    console.log();
  }

  // PASO 4: WorkGroupExecutor por workGroupId
  console.log("PASO 4: WorkGroupExecutor por workGroupId...");
  const executors = await prisma.workGroupExecutor.findMany({
    where: {
      workGroupId: workGroupId,
    },
    select: {
      id: true,
      status: true,
      teamId: true,
      hostTenantId: true,
      servicesTenantId: true,
      workGroupId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`📊 WorkGroupExecutors encontrados: ${executors.length}`);
  if (executors.length === 0) {
    console.warn("   ⚠️  NO se encontraron WorkGroupExecutors para este workGroupId");
  } else {
    executors.forEach((executor, idx) => {
      console.log(`   [${idx + 1}]`);
      console.log(`      - ID: ${executor.id}`);
      console.log(`      - status: ${executor.status}`);
      console.log(`      - teamId: ${executor.teamId}`);
      console.log(`      - hostTenantId: ${executor.hostTenantId}`);
      console.log(`      - servicesTenantId: ${executor.servicesTenantId}`);
      console.log(`      - workGroupId: ${executor.workGroupId}`);
      console.log();
    });
  }

  const executorTeamIds = executors.map((e) => e.teamId);
  console.log(`   TeamIds en WorkGroupExecutor: [${executorTeamIds.join(", ")}]`);
  console.log();

  // PASO 5: Veredicto
  console.log("=".repeat(80));
  console.log("VEREDICTO");
  console.log("=".repeat(80));
  console.log();

  console.log("1. El user pertenece a:");
  if (userTeamIds.length === 0) {
    console.log("   ❌ Ningún team (no hay TeamMemberships ACTIVE)");
  } else {
    userTeamIds.forEach((tid, idx) => {
      const isA = tid === teamIdA;
      const isB = tid === teamIdB;
      const matchLabel = isA ? " (TeamIdA)" : isB ? " (TeamIdB)" : "";
      console.log(`   [${idx + 1}] ${tid}${matchLabel}`);
    });
  }
  console.log();

  console.log("2. El workGroup executor apunta a:");
  if (executorTeamIds.length === 0) {
    console.log("   ❌ Ningún team (no hay WorkGroupExecutors)");
  } else {
    executorTeamIds.forEach((tid, idx) => {
      const isA = tid === teamIdA;
      const isB = tid === teamIdB;
      const matchLabel = isA ? " (TeamIdA)" : isB ? " (TeamIdB)" : "";
      const isActive = executors[idx]?.status === "ACTIVE";
      const statusLabel = isActive ? " ✅ ACTIVE" : " ⚠️  NO ACTIVE";
      console.log(`   [${idx + 1}] ${tid}${matchLabel}${statusLabel}`);
    });
  }
  console.log();

  // Análisis de match
  const userHasTeamA = userTeamIds.includes(teamIdA);
  const userHasTeamB = userTeamIds.includes(teamIdB);
  const executorPointsToA = executorTeamIds.includes(teamIdA);
  const executorPointsToB = executorTeamIds.includes(teamIdB);

  console.log("3. Análisis de match:");
  console.log(`   User tiene TeamIdA? ${userHasTeamA ? "✅ SÍ" : "❌ NO"}`);
  console.log(`   User tiene TeamIdB? ${userHasTeamB ? "✅ SÍ" : "❌ NO"}`);
  console.log(`   Executor apunta a TeamIdA? ${executorPointsToA ? "✅ SÍ" : "❌ NO"}`);
  console.log(`   Executor apunta a TeamIdB? ${executorPointsToB ? "✅ SÍ" : "❌ NO"}`);
  console.log();

  // Recomendaciones
  console.log("4. Recomendaciones:");
  if (!userHasTeamA && !userHasTeamB) {
    console.log("   ⚠️  El user NO pertenece a ninguno de los teams verificados");
    console.log("   → Verificar si el user tiene TeamMembership en otro team");
  } else if (userHasTeamA && !executorPointsToA && executorPointsToB) {
    console.log("   🔴 MISMATCH DETECTADO:");
    console.log(`   → El user pertenece a TeamIdA (${teamIdA}) pero el executor apunta a TeamIdB (${teamIdB})`);
    console.log(`   → Fix sugerido: Actualizar WorkGroupExecutor.teamId de "${teamIdB}" a "${teamIdA}"`);
    console.log(`   → SQL: UPDATE "WorkGroupExecutor" SET "teamId" = '${teamIdA}' WHERE "id" = '${executors.find((e) => e.teamId === teamIdB)?.id}'`);
  } else if (userHasTeamB && !executorPointsToB && executorPointsToA) {
    console.log("   🔴 MISMATCH DETECTADO:");
    console.log(`   → El user pertenece a TeamIdB (${teamIdB}) pero el executor apunta a TeamIdA (${teamIdA})`);
    console.log(`   → Fix sugerido: Actualizar WorkGroupExecutor.teamId de "${teamIdA}" a "${teamIdB}"`);
    console.log(`   → SQL: UPDATE "WorkGroupExecutor" SET "teamId" = '${teamIdB}' WHERE "id" = '${executors.find((e) => e.teamId === teamIdA)?.id}'`);
  } else if (userHasTeamA && executorPointsToA) {
    console.log("   ✅ MATCH CORRECTO:");
    console.log(`   → El user pertenece a TeamIdA y el executor apunta a TeamIdA`);
    console.log(`   → TeamIdA (${teamIdA}) es el team correcto`);
  } else if (userHasTeamB && executorPointsToB) {
    console.log("   ✅ MATCH CORRECTO:");
    console.log(`   → El user pertenece a TeamIdB y el executor apunta a TeamIdB`);
    console.log(`   → TeamIdB (${teamIdB}) es el team correcto`);
  } else if (userHasTeamA && userHasTeamB) {
    console.log("   ⚠️  El user pertenece a AMBOS teams");
    console.log(`   → Verificar cuál es el team principal (probablemente el más reciente)`);
  } else {
    console.log("   ⚠️  Situación no cubierta por el análisis");
  }

  console.log();
  console.log("=".repeat(80));
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

