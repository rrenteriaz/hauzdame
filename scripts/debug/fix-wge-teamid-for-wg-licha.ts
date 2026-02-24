// scripts/debug/fix-wge-teamid-for-wg-licha.ts
// Script para corregir WorkGroupExecutor.teamId cuando apunta al team equivocado
// Por defecto DRY RUN (no aplica cambios), usar --apply para aplicar

import "dotenv/config";
import prisma from "@/lib/prisma";

// Defaults
const DEFAULT_WORK_GROUP_ID = "cmkre0wux0000q8o7ih725syw";
const DEFAULT_FROM_TEAM_ID = "cmkre2tl90004q8o7xlms3h83";
const DEFAULT_TO_TEAM_ID = "cmkrezy8j00011oo7b3zoiizo";
const DEFAULT_USER_EMAIL = "cleaner2@hausdame.test";

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let workGroupId = DEFAULT_WORK_GROUP_ID;
  let fromTeamId = DEFAULT_FROM_TEAM_ID;
  let toTeamId = DEFAULT_TO_TEAM_ID;
  let userEmail = DEFAULT_USER_EMAIL;
  let apply = false;

  for (const arg of args) {
    if (arg.startsWith("--workGroupId=")) {
      workGroupId = arg.split("=")[1];
    } else if (arg.startsWith("--fromTeamId=")) {
      fromTeamId = arg.split("=")[1];
    } else if (arg.startsWith("--toTeamId=")) {
      toTeamId = arg.split("=")[1];
    } else if (arg.startsWith("--userEmail=")) {
      userEmail = arg.split("=")[1];
    } else if (arg === "--apply") {
      apply = true;
    }
  }

  return { workGroupId, fromTeamId, toTeamId, userEmail, apply };
}

async function main() {
  const { workGroupId, fromTeamId, toTeamId, userEmail, apply } = parseArgs();

  console.log("=".repeat(80));
  console.log("FIX: WorkGroupExecutor.teamId mismatch");
  console.log("=".repeat(80));
  console.log();
  console.log(`WorkGroup ID: ${workGroupId}`);
  console.log(`From Team ID: ${fromTeamId}`);
  console.log(`To Team ID: ${toTeamId}`);
  console.log(`User Email: ${userEmail}`);
  console.log(`Mode: ${apply ? "🔴 APPLY (cambios reales)" : "🔵 DRY RUN (solo reporte)"}`);
  console.log();

  // PASO 1: Validar que WorkGroupExecutor existe
  console.log("PASO 1: Validando WorkGroupExecutor...");
  const executors = await prisma.workGroupExecutor.findMany({
    where: {
      workGroupId: workGroupId,
      teamId: fromTeamId,
    },
    select: {
      id: true,
      status: true,
      hostTenantId: true,
      servicesTenantId: true,
      teamId: true,
      workGroupId: true,
    },
  });

  if (executors.length === 0) {
    console.error(`❌ NO se encontraron WorkGroupExecutors para workGroupId=${workGroupId} y teamId=${fromTeamId}`);
    console.error("   No hay nada que corregir.");
    process.exit(1);
  }

  console.log(`✅ Encontrados ${executors.length} WorkGroupExecutor(s):`);
  executors.forEach((exec, idx) => {
    console.log(`   [${idx + 1}]`);
    console.log(`      - ID: ${exec.id}`);
    console.log(`      - status: ${exec.status}`);
    console.log(`      - hostTenantId: ${exec.hostTenantId}`);
    console.log(`      - servicesTenantId: ${exec.servicesTenantId}`);
    console.log(`      - teamId (actual): ${exec.teamId}`);
    console.log(`      - workGroupId: ${exec.workGroupId}`);
    console.log();
  });

  // PASO 2: Validar que toTeamId existe
  console.log("PASO 2: Validando que toTeamId existe...");
  const toTeam = await prisma.team.findUnique({
    where: { id: toTeamId },
    select: {
      id: true,
      name: true,
      tenantId: true,
      status: true,
    },
  });

  if (!toTeam) {
    console.error(`❌ Team con id=${toTeamId} NO EXISTE`);
    console.error("   No se puede aplicar el fix.");
    process.exit(1);
  }

  console.log(`✅ Team destino existe:`);
  console.log(`   - ID: ${toTeam.id}`);
  console.log(`   - Name: ${toTeam.name}`);
  console.log(`   - tenantId: ${toTeam.tenantId}`);
  console.log(`   - status: ${toTeam.status}`);
  console.log();

  // PASO 3: Validación cross-tenant (bloqueante en --apply)
  console.log("PASO 3: Validando cross-tenant (servicesTenantId vs toTeam.tenantId)...");
  let hasTenantMismatch = false;
  for (const executor of executors) {
    if (executor.servicesTenantId !== toTeam.tenantId) {
      hasTenantMismatch = true;
      console.error(`❌ MISMATCH detectado en executor ID=${executor.id}:`);
      console.error(`   executor.servicesTenantId: ${executor.servicesTenantId}`);
      console.error(`   toTeam.tenantId: ${toTeam.tenantId}`);
      console.error(`   Esto causaría inconsistencia cross-tenant`);
    }
  }

  if (hasTenantMismatch) {
    if (apply) {
      console.error();
      console.error("=".repeat(80));
      console.error("🔴 ABORTANDO: Cross-tenant mismatch detectado");
      console.error("=".repeat(80));
      console.error("No se puede aplicar el fix porque hay inconsistencia de tenant.");
      console.error("El executor.servicesTenantId debe coincidir con toTeam.tenantId");
      process.exit(1);
    } else {
      console.warn();
      console.warn("⚠️  WARNING: Cross-tenant mismatch detectado (dry-run, no se aplicará)");
    }
  } else {
    console.log(`✅ Todos los executors tienen servicesTenantId consistente con toTeam.tenantId`);
  }
  console.log();

  // PASO 4: Validar TeamMembership (bloqueante en --apply)
  console.log("PASO 4: Validando TeamMembership del usuario...");
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true },
  });

  if (!user) {
    console.warn(`⚠️  User con email=${userEmail} NO EXISTE (validación de membership omitida)`);
  } else {
    const membership = await prisma.teamMembership.findFirst({
      where: {
        userId: user.id,
        teamId: toTeamId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!membership) {
      if (apply) {
        console.error();
        console.error("=".repeat(80));
        console.error("🔴 ABORTANDO: User NO tiene TeamMembership ACTIVE en toTeamId");
        console.error("=".repeat(80));
        console.error(`User: ${userEmail} (ID: ${user.id})`);
        console.error(`toTeamId: ${toTeamId}`);
        console.error("No se puede aplicar el fix porque el user no pertenece al team destino.");
        console.error("El user debe tener TeamMembership ACTIVE en toTeamId antes de aplicar.");
        process.exit(1);
      } else {
        console.warn(`⚠️  User NO tiene TeamMembership ACTIVE en toTeamId=${toTeamId}`);
        console.warn("   En modo --apply esto causaría aborto");
      }
    } else {
      console.log(`✅ User tiene TeamMembership ACTIVE:`);
      console.log(`   - Membership ID: ${membership.id}`);
      console.log(`   - Role: ${membership.role}`);
      console.log(`   - Status: ${membership.status}`);
    }
  }
  console.log();

  // PASO 5: Reporte de cambios
  console.log("=".repeat(80));
  console.log("REPORTE DE CAMBIOS");
  console.log("=".repeat(80));
  console.log();
  console.log(`Se actualizarán ${executors.length} WorkGroupExecutor(s):`);
  executors.forEach((exec, idx) => {
    console.log(`   [${idx + 1}] ID: ${exec.id}`);
    console.log(`      teamId: "${exec.teamId}" → "${toTeamId}"`);
  });
  console.log();
  console.log(`Query a ejecutar:`);
  console.log(`   UPDATE "WorkGroupExecutor"`);
  console.log(`   SET "teamId" = '${toTeamId}'`);
  console.log(`   WHERE "workGroupId" = '${workGroupId}' AND "teamId" = '${fromTeamId}'`);
  console.log();

  if (!apply) {
    console.log("=".repeat(80));
    console.log("🔵 DRY RUN - No se aplicaron cambios");
    console.log("Para aplicar los cambios, ejecuta con --apply:");
    console.log(`   npx tsx scripts/debug/fix-wge-teamid-for-wg-licha.ts --apply`);
    console.log("=".repeat(80));
    return;
  }

  // PASO 6: Aplicar cambios
  console.log("=".repeat(80));
  console.log("🔴 APLICANDO CAMBIOS...");
  console.log("=".repeat(80));
  console.log();

  try {
    const result = await prisma.workGroupExecutor.updateMany({
      where: {
        workGroupId: workGroupId,
        teamId: fromTeamId,
      },
      data: {
        teamId: toTeamId,
      },
    });

    console.log(`✅ Cambios aplicados exitosamente`);
    console.log(`   Rows afectadas: ${result.count}`);
    console.log();
  } catch (error: any) {
    console.error(`❌ Error al aplicar cambios:`);
    console.error(`   ${error.message}`);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    process.exit(1);
  }

  // PASO 7: Post-check
  console.log("PASO 7: Verificando cambios aplicados...");
  const updatedExecutors = await prisma.workGroupExecutor.findMany({
    where: {
      workGroupId: workGroupId,
      teamId: toTeamId,
    },
    select: {
      id: true,
      status: true,
      hostTenantId: true,
      servicesTenantId: true,
      teamId: true,
      workGroupId: true,
    },
  });

  console.log(`📊 WorkGroupExecutors después del update: ${updatedExecutors.length}`);
  if (updatedExecutors.length === 0) {
    console.error(`❌ NO se encontraron executors después del update (algo salió mal)`);
  } else {
    console.log(`✅ Executors actualizados correctamente:`);
    updatedExecutors.forEach((exec, idx) => {
      console.log(`   [${idx + 1}]`);
      console.log(`      - ID: ${exec.id}`);
      console.log(`      - status: ${exec.status}`);
      console.log(`      - hostTenantId: ${exec.hostTenantId}`);
      console.log(`      - servicesTenantId: ${exec.servicesTenantId}`);
      console.log(`      - teamId (nuevo): ${exec.teamId} ✅`);
      console.log(`      - workGroupId: ${exec.workGroupId}`);
      console.log();
    });
  }

  // Verificar que no quedan executors con el teamId antiguo
  const oldExecutors = await prisma.workGroupExecutor.findMany({
    where: {
      workGroupId: workGroupId,
      teamId: fromTeamId,
    },
    select: {
      id: true,
      teamId: true,
    },
  });

  if (oldExecutors.length > 0) {
    console.warn(`⚠️  Aún quedan ${oldExecutors.length} executors con el teamId antiguo:`);
    oldExecutors.forEach((exec) => {
      console.warn(`   - ID: ${exec.id}, teamId: ${exec.teamId}`);
    });
  } else {
    console.log(`✅ No quedan executors con el teamId antiguo`);
  }

  console.log();
  console.log("=".repeat(80));
  console.log("✅ FIX COMPLETADO");
  console.log("=".repeat(80));
  console.log();
  console.log("Próximos pasos:");
  console.log(`1. Ejecutar diagnóstico:`);
  console.log(`   npx tsx scripts/debug/diagnose-licha-wg-properties.ts --workGroupId=${workGroupId} --teamId=${toTeamId}`);
  console.log(`2. Verificar UI en:`);
  console.log(`   /cleaner/teams/${toTeamId}`);
  console.log();
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

