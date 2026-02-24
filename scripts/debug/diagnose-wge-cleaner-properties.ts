// scripts/debug/diagnose-wge-cleaner-properties.ts
// Script de diagnóstico para verificar por qué el Cleaner no ve propiedades después de aceptar WorkGroupInvite

import "dotenv/config";
import prisma from "@/lib/prisma";

const CLEANER_EMAIL = "cleaner2@hausdame.test";
const WORKGROUP_NAME = "Licha";

async function main() {
  console.log("=".repeat(80));
  console.log("DIAGNÓSTICO: WorkGroupExecutor → Propiedades para Cleaner");
  console.log("=".repeat(80));
  console.log();

  // PASO 1: Encontrar el usuario cleaner
  console.log("PASO 1: Buscando usuario cleaner...");
  const cleaner = await prisma.user.findUnique({
    where: { email: CLEANER_EMAIL },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
    },
  });

  if (!cleaner) {
    console.error(`❌ Usuario ${CLEANER_EMAIL} no encontrado`);
    process.exit(1);
  }

  console.log(`✅ Usuario encontrado:`);
  console.log(`   - ID: ${cleaner.id}`);
  console.log(`   - Email: ${cleaner.email}`);
  console.log(`   - Name: ${cleaner.name || "N/A"}`);
  console.log(`   - Role: ${cleaner.role}`);
  console.log(`   - tenantId (Services): ${cleaner.tenantId || "NULL"}`);
  console.log();

  if (!cleaner.tenantId) {
    console.error("❌ El cleaner NO tiene tenantId asignado (Services tenant)");
    process.exit(1);
  }

  const servicesTenantId = cleaner.tenantId;

  // PASO 2: Encontrar el Team "Mi equipo" del cleaner
  console.log("PASO 2: Buscando Team 'Mi equipo' del cleaner...");
  const team = await prisma.team.findFirst({
    where: {
      tenantId: servicesTenantId,
      name: "Mi equipo",
    },
    select: {
      id: true,
      name: true,
      tenantId: true,
      status: true,
    },
  });

  if (!team) {
    console.error("❌ No se encontró el Team 'Mi equipo' para el cleaner");
    process.exit(1);
  }

  console.log(`✅ Team encontrado:`);
  console.log(`   - ID: ${team.id}`);
  console.log(`   - Name: ${team.name}`);
  console.log(`   - tenantId: ${team.tenantId}`);
  console.log(`   - Status: ${team.status}`);
  console.log();

  const teamId = team.id;

  // PASO 3: Verificar TeamMembership
  console.log("PASO 3: Verificando TeamMembership...");
  const membership = await prisma.teamMembership.findFirst({
    where: {
      userId: cleaner.id,
      teamId: teamId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!membership) {
    console.error("❌ No se encontró TeamMembership ACTIVE para el cleaner");
    process.exit(1);
  }

  console.log(`✅ TeamMembership encontrado:`);
  console.log(`   - ID: ${membership.id}`);
  console.log(`   - Role: ${membership.role}`);
  console.log(`   - Status: ${membership.status}`);
  console.log();

  // PASO 4: Buscar WorkGroup "Licha"
  console.log(`PASO 4: Buscando WorkGroup '${WORKGROUP_NAME}'...`);
  const workGroup = await (prisma as any).hostWorkGroup.findFirst({
    where: {
      name: WORKGROUP_NAME,
    },
    select: {
      id: true,
      name: true,
      tenantId: true,
    },
  });

  if (!workGroup) {
    console.error(`❌ WorkGroup '${WORKGROUP_NAME}' no encontrado`);
    console.log("   Intentando buscar todos los WorkGroups...");
    const allWorkGroups = await (prisma as any).hostWorkGroup.findMany({
      select: {
        id: true,
        name: true,
        tenantId: true,
      },
      take: 10,
    });
    console.log(`   Encontrados ${allWorkGroups.length} WorkGroups:`);
    allWorkGroups.forEach((wg: any) => {
      console.log(`   - ${wg.name} (ID: ${wg.id}, tenantId: ${wg.tenantId})`);
    });
    process.exit(1);
  }

  console.log(`✅ WorkGroup encontrado:`);
  console.log(`   - ID: ${workGroup.id}`);
  console.log(`   - Name: ${workGroup.name}`);
  console.log(`   - tenantId (Host): ${workGroup.tenantId}`);
  console.log();

  const hostTenantId = workGroup.tenantId;
  const workGroupId = workGroup.id;

  // PASO 5: Verificar WorkGroupExecutor
  console.log("PASO 5: Verificando WorkGroupExecutor...");
  const executors = await prisma.workGroupExecutor.findMany({
    where: {
      teamId: teamId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      hostTenantId: true,
      servicesTenantId: true,
      workGroupId: true,
      teamId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log(`📊 WorkGroupExecutors encontrados para teamId=${teamId}: ${executors.length}`);
  if (executors.length === 0) {
    console.error("❌ NO se encontraron WorkGroupExecutors ACTIVE para este team");
    console.log("   Esto significa que el claim NO creó el WGE o está INACTIVE");
  } else {
    executors.forEach((exec, idx) => {
      console.log(`   [${idx + 1}]`);
      console.log(`      - ID: ${exec.id}`);
      console.log(`      - hostTenantId: ${exec.hostTenantId}`);
      console.log(`      - servicesTenantId: ${exec.servicesTenantId}`);
      console.log(`      - workGroupId: ${exec.workGroupId}`);
      console.log(`      - teamId: ${exec.teamId}`);
      console.log(`      - status: ${exec.status}`);
      console.log(`      - createdAt: ${exec.createdAt}`);
      console.log();
    });

    // Verificar si hay uno específico para el WorkGroup "Licha"
    const lichExecutor = executors.find((e) => e.workGroupId === workGroupId);
    if (!lichExecutor) {
      console.error(`❌ NO se encontró WorkGroupExecutor para workGroupId=${workGroupId} (Licha)`);
    } else {
      console.log(`✅ WorkGroupExecutor encontrado para WorkGroup 'Licha':`);
      console.log(`   - ID: ${lichExecutor.id}`);
      console.log(`   - hostTenantId: ${lichExecutor.hostTenantId} (esperado: ${hostTenantId})`);
      console.log(`   - servicesTenantId: ${lichExecutor.servicesTenantId} (esperado: ${servicesTenantId})`);
      console.log(`   - workGroupId: ${lichExecutor.workGroupId} (esperado: ${workGroupId})`);
      console.log(`   - teamId: ${lichExecutor.teamId} (esperado: ${teamId})`);
      console.log();
    }
  }

  // PASO 6: Verificar HostWorkGroupProperty
  console.log("PASO 6: Verificando HostWorkGroupProperty...");
  const wgProperties = await (prisma as any).hostWorkGroupProperty.findMany({
    where: {
      tenantId: hostTenantId,
      workGroupId: workGroupId,
    },
    select: {
      id: true,
      tenantId: true,
      workGroupId: true,
      propertyId: true,
      property: {
        select: {
          id: true,
          name: true,
          shortName: true,
          isActive: true,
          tenantId: true,
        },
      },
    },
  });

  console.log(`📊 HostWorkGroupProperties encontradas para workGroupId=${workGroupId}: ${wgProperties.length}`);
  if (wgProperties.length === 0) {
    console.warn("⚠️  NO se encontraron propiedades asignadas al WorkGroup 'Licha'");
    console.log("   Esto NO es un bug, simplemente el WorkGroup no tiene propiedades asignadas");
  } else {
    wgProperties.forEach((wgProp: any, idx: number) => {
      console.log(`   [${idx + 1}]`);
      console.log(`      - ID: ${wgProp.id}`);
      console.log(`      - tenantId: ${wgProp.tenantId} (esperado: ${hostTenantId})`);
      console.log(`      - workGroupId: ${wgProp.workGroupId} (esperado: ${workGroupId})`);
      console.log(`      - propertyId: ${wgProp.propertyId}`);
      console.log(`      - Property:`);
      console.log(`         * name: ${wgProp.property.name}`);
      console.log(`         * shortName: ${wgProp.property.shortName || "N/A"}`);
      console.log(`         * isActive: ${wgProp.property.isActive}`);
      console.log(`         * tenantId: ${wgProp.property.tenantId} (esperado: ${hostTenantId})`);
      console.log();
    });
  }

  // PASO 7: Ejecutar helper getPropertiesForCleanerTeamViaWGE
  console.log("PASO 7: Ejecutando helper getPropertiesForCleanerTeamViaWGE...");
  const { getPropertiesForCleanerTeamViaWGE } = await import("@/lib/workgroups/getPropertiesForCleanerTeamViaWGE");
  const propertyIdsFromHelper = await getPropertiesForCleanerTeamViaWGE(teamId);

  console.log(`📊 PropertyIds retornados por helper: ${propertyIdsFromHelper.length}`);
  if (propertyIdsFromHelper.length === 0) {
    console.error("❌ El helper NO retornó ninguna propertyId");
  } else {
    console.log(`✅ PropertyIds retornados:`);
    propertyIdsFromHelper.forEach((propId, idx) => {
      console.log(`   [${idx + 1}] ${propId}`);
    });
    console.log();
  }

  // PASO 8: Verificar Properties directamente
  if (propertyIdsFromHelper.length > 0) {
    console.log("PASO 8: Verificando Properties directamente...");
    const properties = await prisma.property.findMany({
      where: {
        tenantId: hostTenantId,
        id: { in: propertyIdsFromHelper },
      },
      select: {
        id: true,
        name: true,
        shortName: true,
        isActive: true,
        tenantId: true,
      },
    });

    console.log(`📊 Properties encontradas: ${properties.length}`);
    properties.forEach((prop, idx) => {
      console.log(`   [${idx + 1}]`);
      console.log(`      - ID: ${prop.id}`);
      console.log(`      - name: ${prop.name}`);
      console.log(`      - shortName: ${prop.shortName || "N/A"}`);
      console.log(`      - isActive: ${prop.isActive}`);
      console.log(`      - tenantId: ${prop.tenantId} (esperado: ${hostTenantId})`);
      console.log();
    });
  }

  // RESUMEN
  console.log("=".repeat(80));
  console.log("RESUMEN DEL DIAGNÓSTICO");
  console.log("=".repeat(80));
  console.log();
  console.log(`Cleaner: ${CLEANER_EMAIL}`);
  console.log(`   - servicesTenantId: ${servicesTenantId}`);
  console.log(`   - teamId: ${teamId}`);
  console.log();
  console.log(`WorkGroup: ${WORKGROUP_NAME}`);
  console.log(`   - hostTenantId: ${hostTenantId}`);
  console.log(`   - workGroupId: ${workGroupId}`);
  console.log();
  console.log(`WorkGroupExecutors encontrados: ${executors.length}`);
  console.log(`HostWorkGroupProperties encontradas: ${wgProperties.length}`);
  console.log(`PropertyIds retornados por helper: ${propertyIdsFromHelper.length}`);
  console.log();

  // DIAGNÓSTICO
  if (executors.length === 0) {
    console.log("🔴 PROBLEMA IDENTIFICADO:");
    console.log("   - NO hay WorkGroupExecutors ACTIVE para el team del cleaner");
    console.log("   - Posible causa: El claim NO creó el WGE o está INACTIVE");
    console.log("   - Verificar: app/api/host-workgroup-invites/[token]/claim/route.ts");
  } else if (wgProperties.length === 0) {
    console.log("🟡 DIAGNÓSTICO:");
    console.log("   - El WorkGroup NO tiene propiedades asignadas");
    console.log("   - Esto NO es un bug, es un problema de datos");
    console.log("   - El Host debe asignar propiedades al WorkGroup desde la UX");
  } else if (propertyIdsFromHelper.length === 0) {
    console.log("🔴 PROBLEMA IDENTIFICADO:");
    console.log("   - Hay WorkGroupExecutors y HostWorkGroupProperties, pero el helper NO retorna propertyIds");
    console.log("   - Posible causa: Bug en getPropertiesForCleanerTeamViaWGE");
    console.log("   - Verificar: lib/workgroups/getPropertiesForCleanerTeamViaWGE.ts");
  } else {
    console.log("✅ TODO PARECE CORRECTO:");
    console.log("   - WorkGroupExecutors: ✅");
    console.log("   - HostWorkGroupProperties: ✅");
    console.log("   - Helper retorna propertyIds: ✅");
    console.log("   - Si la UI NO muestra propiedades, el problema está en el mapping/UI");
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

