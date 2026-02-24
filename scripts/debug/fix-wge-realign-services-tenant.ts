// scripts/debug/fix-wge-realign-services-tenant.ts
// Script para realinear WorkGroupExecutor al services tenant correcto
// Actualiza tanto teamId como servicesTenantId para mantener consistencia cross-tenant
// Por defecto DRY RUN (no aplica cambios), usar --apply para aplicar

import "dotenv/config";
import prisma from "@/lib/prisma";

// Defaults
const DEFAULT_EXECUTOR_ID = "cmkre2xyp000aq8o71gqpjp8f";
const DEFAULT_WORK_GROUP_ID = "cmkre0wux0000q8o7ih725syw";
const DEFAULT_TO_TEAM_ID = "cmkrezy8j00011oo7b3zoiizo";
const DEFAULT_USER_EMAIL = "cleaner2@hausdame.test";

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let executorId = DEFAULT_EXECUTOR_ID;
  let workGroupId = DEFAULT_WORK_GROUP_ID;
  let toTeamId = DEFAULT_TO_TEAM_ID;
  let userEmail = DEFAULT_USER_EMAIL;
  let apply = false;

  for (const arg of args) {
    if (arg.startsWith("--executorId=")) {
      executorId = arg.split("=")[1];
    } else if (arg.startsWith("--workGroupId=")) {
      workGroupId = arg.split("=")[1];
    } else if (arg.startsWith("--toTeamId=")) {
      toTeamId = arg.split("=")[1];
    } else if (arg.startsWith("--userEmail=")) {
      userEmail = arg.split("=")[1];
    } else if (arg === "--apply") {
      apply = true;
    }
  }

  return { executorId, workGroupId, toTeamId, userEmail, apply };
}

async function main() {
  const { executorId, workGroupId, toTeamId, userEmail, apply } = parseArgs();

  console.log("=".repeat(80));
  console.log("FIX: WorkGroupExecutor realineamiento cross-tenant");
  console.log("=".repeat(80));
  console.log();
  console.log(`Executor ID: ${executorId}`);
  console.log(`WorkGroup ID: ${workGroupId}`);
  console.log(`To Team ID: ${toTeamId}`);
  console.log(`User Email: ${userEmail}`);
  console.log(`Mode: ${apply ? "🔴 APPLY (cambios reales)" : "🔵 DRY RUN (solo reporte)"}`);
  console.log();

  // VALIDACIÓN 1: Executor existe y coincide con workGroupId
  console.log("VALIDACIÓN 1: Verificando Executor...");
  const executor = await prisma.workGroupExecutor.findUnique({
    where: { id: executorId },
    select: {
      id: true,
      status: true,
      hostTenantId: true,
      servicesTenantId: true,
      workGroupId: true,
      teamId: true,
    },
  });

  if (!executor) {
    console.error(`❌ Executor con id=${executorId} NO EXISTE`);
    process.exit(1);
  }

  console.log(`✅ Executor encontrado:`);
  console.log(`   - ID: ${executor.id}`);
  console.log(`   - status: ${executor.status}`);
  console.log(`   - hostTenantId: ${executor.hostTenantId}`);
  console.log(`   - servicesTenantId (actual): ${executor.servicesTenantId}`);
  console.log(`   - workGroupId: ${executor.workGroupId}`);
  console.log(`   - teamId (actual): ${executor.teamId}`);
  console.log();

  // Validar estado del executor (bloqueante en --apply)
  if (executor.status !== "ACTIVE") {
    if (apply) {
      console.error();
      console.error("=".repeat(80));
      console.error("🔴 ABORTANDO: Executor NO está ACTIVE");
      console.error("=".repeat(80));
      console.error(`Executor ID: ${executor.id}`);
      console.error(`Status actual: ${executor.status}`);
      console.error("No se puede aplicar el fix porque el executor no está ACTIVE.");
      process.exit(1);
    } else {
      console.warn(`⚠️  Executor NO está ACTIVE (status: ${executor.status})`);
      console.warn("   En modo --apply esto causaría aborto");
    }
  }

  if (workGroupId && executor.workGroupId !== workGroupId) {
    console.error(`❌ MISMATCH: executor.workGroupId (${executor.workGroupId}) != workGroupId proporcionado (${workGroupId})`);
    if (apply) {
      process.exit(1);
    } else {
      console.warn("   (dry-run, continuando...)");
    }
  }

  // VALIDACIÓN 2: toTeam existe
  console.log("VALIDACIÓN 2: Verificando toTeam...");
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
    if (apply) {
      process.exit(1);
    }
    return;
  }

  console.log(`✅ Team destino existe:`);
  console.log(`   - ID: ${toTeam.id}`);
  console.log(`   - Name: ${toTeam.name}`);
  console.log(`   - tenantId (servicesTenantId destino): ${toTeam.tenantId}`);
  console.log(`   - status: ${toTeam.status}`);
  console.log();

  // Validar estado del team (bloqueante en --apply)
  if (toTeam.status !== "ACTIVE") {
    if (apply) {
      console.error();
      console.error("=".repeat(80));
      console.error("🔴 ABORTANDO: Team destino NO está ACTIVE");
      console.error("=".repeat(80));
      console.error(`Team ID: ${toTeam.id}`);
      console.error(`Status actual: ${toTeam.status}`);
      console.error("No se puede aplicar el fix porque el team destino no está ACTIVE.");
      process.exit(1);
    } else {
      console.warn(`⚠️  Team destino NO está ACTIVE (status: ${toTeam.status})`);
      console.warn("   En modo --apply esto causaría aborto");
    }
  }

  // VALIDACIÓN 3: Membership ACTIVE del usuario
  console.log("VALIDACIÓN 3: Verificando TeamMembership del usuario...");
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true },
  });

  if (!user) {
    console.error(`❌ User con email=${userEmail} NO EXISTE`);
    if (apply) {
      process.exit(1);
    }
    return;
  }

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
  console.log();

  // VALIDACIÓN 4: Verificar que NO exista executor duplicado
  console.log("VALIDACIÓN 4: Verificando duplicados...");
  const duplicateExecutor = await prisma.workGroupExecutor.findFirst({
    where: {
      workGroupId: executor.workGroupId,
      teamId: toTeamId,
      servicesTenantId: toTeam.tenantId,
      hostTenantId: executor.hostTenantId,
      status: "ACTIVE",
      id: { not: executorId },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (duplicateExecutor) {
    if (apply) {
      console.error();
      console.error("=".repeat(80));
      console.error("🔴 ABORTANDO: Ya existe un executor ACTIVE duplicado");
      console.error("=".repeat(80));
      console.error(`Executor duplicado ID: ${duplicateExecutor.id}`);
      console.error(`   workGroupId: ${executor.workGroupId}`);
      console.error(`   teamId: ${toTeamId}`);
      console.error(`   servicesTenantId: ${toTeam.tenantId}`);
      console.error(`   hostTenantId: ${executor.hostTenantId}`);
      console.error("No se puede aplicar el fix porque crearía un duplicado.");
      console.error("Considera eliminar el executor duplicado primero o usar ese executor.");
      process.exit(1);
    } else {
      console.warn(`⚠️  Ya existe un executor ACTIVE duplicado (ID: ${duplicateExecutor.id})`);
      console.warn("   En modo --apply esto causaría aborto");
    }
  } else {
    console.log(`✅ No hay executor duplicado`);
  }
  console.log();

  // VALIDACIÓN 5: Validar HostWorkGroup (bloqueante en --apply)
  console.log("VALIDACIÓN 5: Verificando HostWorkGroup...");
  const wg = await (prisma as any).hostWorkGroup.findUnique({
    where: { id: executor.workGroupId },
    select: {
      id: true,
      tenantId: true,
    },
  });

  if (!wg) {
    if (apply) {
      console.error();
      console.error("=".repeat(80));
      console.error("🔴 ABORTANDO: HostWorkGroup NO EXISTE");
      console.error("=".repeat(80));
      console.error(`WorkGroup ID: ${executor.workGroupId}`);
      console.error("No se puede aplicar el fix porque el HostWorkGroup no existe.");
      process.exit(1);
    } else {
      console.warn(`⚠️  HostWorkGroup con id=${executor.workGroupId} NO EXISTE`);
      console.warn("   En modo --apply esto causaría aborto");
    }
  } else {
    console.log(`✅ HostWorkGroup existe:`);
    console.log(`   - ID: ${wg.id}`);
    console.log(`   - tenantId: ${wg.tenantId}`);
    console.log();

    // Validar consistencia hostTenantId
    if (wg.tenantId !== executor.hostTenantId) {
      if (apply) {
        console.error();
        console.error("=".repeat(80));
        console.error("🔴 ABORTANDO: HostTenantId MISMATCH");
        console.error("=".repeat(80));
        console.error(`HostWorkGroup.tenantId: ${wg.tenantId}`);
        console.error(`Executor.hostTenantId: ${executor.hostTenantId}`);
        console.error("No se puede aplicar el fix porque hay inconsistencia de host tenant.");
        process.exit(1);
      } else {
        console.warn();
        console.warn("⚠️  ⚠️  ⚠️  WARNING CRÍTICO: HostTenantId MISMATCH");
        console.warn(`   HostWorkGroup.tenantId (${wg.tenantId}) != Executor.hostTenantId (${executor.hostTenantId})`);
        console.warn("   En modo --apply esto causaría aborto");
        console.warn("   Esto indica una inconsistencia grave en los datos.");
      }
    } else {
      console.log(`✅ HostTenantId es consistente (${executor.hostTenantId})`);
    }
  }
  console.log();

  // VALIDACIÓN 6: (Opcional) Verificar HostWorkGroupProperty
  console.log("VALIDACIÓN 6: Verificando HostWorkGroupProperty (opcional)...");
  const wgProperties = await (prisma as any).hostWorkGroupProperty.findMany({
    where: {
      workGroupId: executor.workGroupId,
    },
    select: {
      id: true,
      propertyId: true,
    },
  });

  if (wgProperties.length === 0) {
    console.warn(`⚠️  El WorkGroup NO tiene propiedades asignadas`);
    console.warn("   El fix se aplicará pero el executor no tendrá acceso a propiedades");
  } else {
    console.log(`✅ WorkGroup tiene ${wgProperties.length} propiedades asignadas`);
  }
  console.log();

  // REPORTE DE CAMBIOS
  console.log("=".repeat(80));
  console.log("REPORTE DE CAMBIOS");
  console.log("=".repeat(80));
  console.log();
  console.log(`Se actualizará el executor ID=${executorId}:`);
  console.log(`   teamId: "${executor.teamId}" → "${toTeamId}"`);
  console.log(`   servicesTenantId: "${executor.servicesTenantId}" → "${toTeam.tenantId}"`);
  console.log();
  console.log(`Campos que se mantienen:`);
  console.log(`   - id: ${executor.id}`);
  console.log(`   - workGroupId: ${executor.workGroupId}`);
  console.log(`   - hostTenantId: ${executor.hostTenantId}`);
  console.log(`   - status: ${executor.status}`);
  console.log();
  console.log(`Query a ejecutar:`);
  console.log(`   UPDATE "WorkGroupExecutor"`);
  console.log(`   SET "teamId" = '${toTeamId}', "servicesTenantId" = '${toTeam.tenantId}'`);
  console.log(`   WHERE "id" = '${executorId}'`);
  console.log();

  if (!apply) {
    console.log("=".repeat(80));
    console.log("🔵 DRY RUN - No se aplicaron cambios");
    console.log("Para aplicar los cambios, ejecuta con --apply:");
    console.log(`   npx tsx scripts/debug/fix-wge-realign-services-tenant.ts --apply`);
    console.log("=".repeat(80));
    return;
  }

  // APLICAR CAMBIOS
  console.log("=".repeat(80));
  console.log("🔴 APLICANDO CAMBIOS...");
  console.log("=".repeat(80));
  console.log();

  try {
    const result = await prisma.workGroupExecutor.update({
      where: { id: executorId },
      data: {
        teamId: toTeamId,
        servicesTenantId: toTeam.tenantId,
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

    console.log(`✅ Cambio aplicado exitosamente`);
    console.log();
    console.log(`Executor actualizado:`);
    console.log(`   - ID: ${result.id}`);
    console.log(`   - status: ${result.status}`);
    console.log(`   - hostTenantId: ${result.hostTenantId}`);
    console.log(`   - servicesTenantId (nuevo): ${result.servicesTenantId} ✅`);
    console.log(`   - teamId (nuevo): ${result.teamId} ✅`);
    console.log(`   - workGroupId: ${result.workGroupId}`);
    console.log();
  } catch (error: any) {
    console.error(`❌ Error al aplicar cambios:`);
    console.error(`   ${error.message}`);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    process.exit(1);
  }

  // POST-CHECK
  console.log("POST-CHECK: Verificando cambios aplicados...");
  const updatedExecutor = await prisma.workGroupExecutor.findUnique({
    where: { id: executorId },
    select: {
      id: true,
      status: true,
      hostTenantId: true,
      servicesTenantId: true,
      teamId: true,
      workGroupId: true,
    },
  });

  if (!updatedExecutor) {
    console.error(`❌ NO se encontró el executor después del update (algo salió mal)`);
  } else {
    const teamIdMatch = updatedExecutor.teamId === toTeamId;
    const servicesTenantMatch = updatedExecutor.servicesTenantId === toTeam.tenantId;
    const allMatch = teamIdMatch && servicesTenantMatch;

    console.log(`📊 Verificación:`);
    console.log(`   teamId: ${updatedExecutor.teamId} ${teamIdMatch ? "✅" : "❌"} (esperado: ${toTeamId})`);
    console.log(`   servicesTenantId: ${updatedExecutor.servicesTenantId} ${servicesTenantMatch ? "✅" : "❌"} (esperado: ${toTeam.tenantId})`);

    if (allMatch) {
      console.log();
      console.log(`✅ Todos los campos fueron actualizados correctamente`);
    } else {
      console.error();
      console.error(`❌ Algunos campos NO coinciden con los valores esperados`);
    }
  }

  console.log();
  console.log("=".repeat(80));
  console.log("✅ FIX COMPLETADO");
  console.log("=".repeat(80));
  console.log();
  console.log("Próximos pasos:");
  console.log(`1. Ejecutar diagnóstico:`);
  console.log(`   npx tsx scripts/debug/diagnose-licha-wg-properties.ts --workGroupId=${executor.workGroupId} --teamId=${toTeamId}`);
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

