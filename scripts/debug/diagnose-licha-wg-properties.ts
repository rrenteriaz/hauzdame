// scripts/debug/diagnose-licha-wg-properties.ts
// Script de diagnóstico para verificar inconsistencia en HostWorkGroupProperty para WorkGroup "Licha"
// Source of truth: deriva datos desde DB, no usa IDs hardcodeados

import "dotenv/config";
import prisma from "@/lib/prisma";

// Defaults
const DEFAULT_WORK_GROUP_ID = "cmkre0wux0000q8o7ih725syw";
const DEFAULT_TEAM_ID = "cmkre2t190004q8o7xlms3h83";

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let workGroupId = DEFAULT_WORK_GROUP_ID;
  let teamId = DEFAULT_TEAM_ID;

  for (const arg of args) {
    if (arg.startsWith("--workGroupId=")) {
      workGroupId = arg.split("=")[1];
    } else if (arg.startsWith("--teamId=")) {
      teamId = arg.split("=")[1];
    }
  }

  return { workGroupId, teamId };
}

async function main() {
  const { workGroupId: WORK_GROUP_ID, teamId: TEAM_ID } = parseArgs();
  console.log("=".repeat(80));
  console.log("DIAGNÓSTICO: HostWorkGroupProperty inconsistencia para WorkGroup 'Licha'");
  console.log("=".repeat(80));
  console.log();
  console.log(`WorkGroup ID: ${WORK_GROUP_ID}`);
  console.log(`Team ID: ${TEAM_ID}`);
  console.log();

  // PASO 0: Derivar hostTenantId real desde HostWorkGroup
  console.log("PASO 0: Derivando hostTenantId desde HostWorkGroup...");
  const hostWorkGroup = await (prisma as any).hostWorkGroup.findUnique({
    where: { id: WORK_GROUP_ID },
    select: {
      id: true,
      name: true,
      tenantId: true,
    },
  });

  if (!hostWorkGroup) {
    console.error(`❌ HostWorkGroup con id=${WORK_GROUP_ID} NO EXISTE`);
    process.exit(1);
  }

  const hostTenantIdReal = hostWorkGroup.tenantId as string;
  console.log(`✅ HostWorkGroup encontrado:`);
  console.log(`   - ID: ${hostWorkGroup.id}`);
  console.log(`   - Name: ${hostWorkGroup.name}`);
  console.log(`   - tenantId (hostTenantIdReal): ${hostTenantIdReal}`);
  console.log();

  // PASO 1: Verificar WorkGroupExecutor (SIN filtrar por status)
  console.log("PASO 1: Verificando WorkGroupExecutor (TODOS, sin filtrar por status)...");
  
  // Query A: Por workGroupId
  console.log("   Query A: WorkGroupExecutor por workGroupId...");
  const executorsByWorkGroup = await prisma.workGroupExecutor.findMany({
    where: {
      workGroupId: WORK_GROUP_ID,
    },
    select: {
      id: true,
      hostTenantId: true,
      servicesTenantId: true,
      workGroupId: true,
      teamId: true,
      status: true,
    },
  });

  console.log(`   📊 WorkGroupExecutors encontrados por workGroupId: ${executorsByWorkGroup.length}`);
  if (executorsByWorkGroup.length === 0) {
    console.warn("   ⚠️  NO se encontraron WorkGroupExecutors para este workGroupId");
  } else {
    executorsByWorkGroup.forEach((exec, idx) => {
      console.log(`   [${idx + 1}]`);
      console.log(`      - ID: ${exec.id}`);
      console.log(`      - status: ${exec.status}`);
      console.log(`      - hostTenantId: ${exec.hostTenantId} (esperado: ${hostTenantIdReal})`);
      console.log(`      - servicesTenantId: ${exec.servicesTenantId}`);
      console.log(`      - workGroupId: ${exec.workGroupId}`);
      console.log(`      - teamId: ${exec.teamId}`);
      console.log();
    });

    // Validación exacta TEAM_ID vs executor.teamId
    if (executorsByWorkGroup.length > 0) {
      const actualTeamIdFromWg = executorsByWorkGroup[0].teamId;
      console.log("   🔍 Validación exacta TEAM_ID:");
      console.log(`      TEAM_ID provided: "${TEAM_ID}" (len: ${TEAM_ID.length})`);
      console.log(`      TEAM_ID from executor: "${actualTeamIdFromWg}" (len: ${actualTeamIdFromWg.length})`);
      console.log(`      TEAM_ID strict equal? ${TEAM_ID === actualTeamIdFromWg}`);
      console.log(`      TEAM_ID char codes (provided): ${TEAM_ID.split("").map((c) => c.charCodeAt(0)).join(",")}`);
      console.log(`      TEAM_ID char codes (executor): ${actualTeamIdFromWg.split("").map((c) => c.charCodeAt(0)).join(",")}`);
      console.log();
    }
  }

  // Query B: Por teamId
  console.log("   Query B: WorkGroupExecutor por teamId...");
  const executorsByTeam = await prisma.workGroupExecutor.findMany({
    where: {
      teamId: TEAM_ID,
    },
    select: {
      id: true,
      hostTenantId: true,
      servicesTenantId: true,
      workGroupId: true,
      teamId: true,
      status: true,
    },
  });

  console.log(`   📊 WorkGroupExecutors encontrados por teamId: ${executorsByTeam.length}`);
  if (executorsByTeam.length === 0) {
    console.warn("   ⚠️  NO se encontraron WorkGroupExecutors para este teamId");
    console.warn("   ⚠️  WARNING: No executors for teamId -> Cleaner no verá propiedades vía WGE");
  } else {
    executorsByTeam.forEach((exec, idx) => {
      console.log(`   [${idx + 1}]`);
      console.log(`      - ID: ${exec.id}`);
      console.log(`      - status: ${exec.status}`);
      console.log(`      - hostTenantId: ${exec.hostTenantId}`);
      console.log(`      - servicesTenantId: ${exec.servicesTenantId}`);
      console.log(`      - workGroupId: ${exec.workGroupId} (esperado: ${WORK_GROUP_ID})`);
      console.log(`      - teamId: ${exec.teamId}`);
      console.log();
    });
  }

  // Verificar si hay executor que conecte teamId con workGroupId
  const executorMatch = executorsByTeam.find(
    (e) => e.workGroupId === WORK_GROUP_ID
  );
  if (!executorMatch) {
    console.error(`   ❌ NO se encontró WorkGroupExecutor que conecte teamId=${TEAM_ID} con workGroupId=${WORK_GROUP_ID}`);
  } else {
    console.log(`   ✅ WorkGroupExecutor encontrado que conecta teamId con workGroupId:`);
    console.log(`      - ID: ${executorMatch.id}`);
    console.log(`      - status: ${executorMatch.status}`);
    console.log(`      - hostTenantId: ${executorMatch.hostTenantId} (esperado: ${hostTenantIdReal})`);
    if (executorMatch.status !== "ACTIVE") {
      console.warn(`      ⚠️  WARNING: Status NO es ACTIVE, el Cleaner NO verá propiedades`);
    }
    console.log();
  }

  // PASO 2: Verificar HostWorkGroupProperty (SIN filtrar por tenantId)
  console.log("PASO 2: Verificando HostWorkGroupProperty (TODAS, sin filtrar por tenantId)...");
  const allWgProperties = await (prisma as any).hostWorkGroupProperty.findMany({
    where: {
      workGroupId: WORK_GROUP_ID,
    },
    select: {
      id: true,
      tenantId: true,
      workGroupId: true,
      propertyId: true,
    },
  });

  console.log(`📊 HostWorkGroupProperties encontradas para workGroupId=${WORK_GROUP_ID}: ${allWgProperties.length}`);
  
  // Separar en correctas e incorrectas
  const correctWgProperties = allWgProperties.filter(
    (wgProp: any) => wgProp.tenantId === hostTenantIdReal
  );
  const incorrectWgProperties = allWgProperties.filter(
    (wgProp: any) => wgProp.tenantId !== hostTenantIdReal
  );

  console.log(`   ✅ Con tenantId correcto (${hostTenantIdReal}): ${correctWgProperties.length}`);
  console.log(`   ❌ Con tenantId incorrecto: ${incorrectWgProperties.length}`);
  console.log();

  if (correctWgProperties.length > 0) {
    console.log("   Filas CORRECTAS:");
    correctWgProperties.forEach((wgProp: any, idx: number) => {
      console.log(`   [${idx + 1}]`);
      console.log(`      - ID: ${wgProp.id}`);
      console.log(`      - tenantId: ${wgProp.tenantId} ✅`);
      console.log(`      - workGroupId: ${wgProp.workGroupId}`);
      console.log(`      - propertyId: ${wgProp.propertyId}`);
      console.log();
    });
  }

  if (incorrectWgProperties.length > 0) {
    console.error("   Filas INCORRECTAS (tenantId != hostTenantIdReal):");
    incorrectWgProperties.forEach((wgProp: any, idx: number) => {
      console.error(`   [${idx + 1}]`);
      console.error(`      - ID: ${wgProp.id}`);
      console.error(`      - tenantId: ${wgProp.tenantId} ❌ (esperado: ${hostTenantIdReal})`);
      console.error(`      - workGroupId: ${wgProp.workGroupId}`);
      console.error(`      - propertyId: ${wgProp.propertyId}`);
      console.error();
    });
  }

  if (allWgProperties.length === 0) {
    console.error("❌ NO se encontraron HostWorkGroupProperties para este WorkGroup");
  }

  // PASO 3: Verificar Properties individuales
  console.log("PASO 3: Verificando Properties...");
  const allPropertyIds = Array.from(new Set(allWgProperties.map((wgProp: any) => wgProp.propertyId)));
  
  if (allPropertyIds.length > 0) {
    console.log(`   Verificando ${allPropertyIds.length} properties únicas...`);
    console.log();

    for (const propertyId of allPropertyIds) {
      const property = await prisma.property.findUnique({
        where: { id: String(propertyId) },
        select: {
          id: true,
          name: true,
          shortName: true,
          tenantId: true,
          isActive: true,
        },
      });

      if (!property) {
        console.error(`   ❌ Property ${propertyId} NO EXISTE en la tabla Property`);
      } else {
        const isCorrectTenant = property.tenantId === hostTenantIdReal;
        const statusIcon = isCorrectTenant ? "✅" : "❌";
        console.log(`   ${statusIcon} Property: ${property.shortName || property.name} (${propertyId})`);
        console.log(`      - tenantId: ${property.tenantId} (esperado: ${hostTenantIdReal})`);
        console.log(`      - isActive: ${property.isActive}`);

        if (!isCorrectTenant) {
          console.error(`      ⚠️  WARNING: Property tenantId MISMATCH`);
        }
        if (!property.isActive) {
          console.warn(`      ⚠️  WARNING: Property está INACTIVA`);
        }
        console.log();
      }
    }
  }

  // PASO 4: Ejecutar helper getPropertiesForCleanerTeamViaWGE
  console.log("PASO 4: Ejecutando helper getPropertiesForCleanerTeamViaWGE...");
  const { getPropertiesForCleanerTeamViaWGE } = await import("@/lib/workgroups/getPropertiesForCleanerTeamViaWGE");
  const propertyIdsFromHelper = await getPropertiesForCleanerTeamViaWGE(TEAM_ID);

  console.log(`📊 PropertyIds retornados por helper: ${propertyIdsFromHelper.length}`);
  if (propertyIdsFromHelper.length === 0) {
    console.error("❌ El helper NO retornó ninguna propertyId");
    if (executorsByTeam.length === 0) {
      console.error("   Causa probable: No hay WorkGroupExecutors ACTIVE para este teamId");
    } else {
      const activeExecutors = executorsByTeam.filter((e) => e.status === "ACTIVE");
      if (activeExecutors.length === 0) {
        console.error("   Causa probable: WorkGroupExecutors existen pero NO están ACTIVE");
      } else {
        console.error("   Causa probable: HostWorkGroupProperty tiene tenantId incorrecto o propiedades inactivas");
      }
    }
  } else {
    console.log(`✅ PropertyIds retornados:`);
    propertyIdsFromHelper.forEach((propId, idx) => {
      console.log(`   [${idx + 1}] ${propId}`);
    });
    console.log();
  }

  // RESUMEN Y DICTAMEN
  console.log();
  console.log("=".repeat(80));
  console.log("DICTAMEN FINAL (basado en datos reales de DB)");
  console.log("=".repeat(80));
  console.log();

  // 1. ¿Existe HostWorkGroup?
  console.log("1. ¿Existe HostWorkGroup?");
  if (hostWorkGroup) {
    console.log(`   ✅ SÍ - Name: "${hostWorkGroup.name}", ID: ${hostWorkGroup.id}`);
  } else {
    console.log(`   ❌ NO`);
  }
  console.log();

  // 2. ¿Cuál es hostTenantIdReal?
  console.log("2. ¿Cuál es hostTenantIdReal?");
  console.log(`   ${hostTenantIdReal}`);
  console.log();

  // 3. ¿Existe WorkGroupExecutor para (teamId, workGroupId)? ¿en qué status?
  console.log("3. ¿Existe WorkGroupExecutor para (teamId, workGroupId)?");
  if (executorMatch) {
    console.log(`   ✅ SÍ - ID: ${executorMatch.id}, Status: ${executorMatch.status}`);
    if (executorMatch.status !== "ACTIVE") {
      console.log(`   ⚠️  WARNING: Status NO es ACTIVE -> Cleaner NO verá propiedades`);
    }
    if (executorMatch.hostTenantId !== hostTenantIdReal) {
      console.log(`   ⚠️  WARNING: hostTenantId MISMATCH - esperado ${hostTenantIdReal}, obtenido ${executorMatch.hostTenantId}`);
    }
  } else {
    console.log(`   ❌ NO - No hay executor que conecte teamId=${TEAM_ID} con workGroupId=${WORK_GROUP_ID}`);
    console.log(`   ⚠️  WARNING: Cleaner NO verá propiedades vía WGE`);
  }
  console.log();

  // 4. ¿Cuántas HostWorkGroupProperty para workGroupId y cuántas con tenantId correcto?
  console.log("4. ¿Cuántas HostWorkGroupProperty para workGroupId y cuántas con tenantId correcto?");
  console.log(`   Total: ${allWgProperties.length}`);
  console.log(`   Con tenantId correcto (${hostTenantIdReal}): ${correctWgProperties.length}`);
  console.log(`   Con tenantId incorrecto: ${incorrectWgProperties.length}`);
  if (incorrectWgProperties.length > 0) {
    console.log(`   ⚠️  WARNING: Hay ${incorrectWgProperties.length} filas con tenantId incorrecto`);
  }
  console.log();

  // DIAGNÓSTICO FINAL
  console.log("=".repeat(80));
  console.log("DIAGNÓSTICO:");
  console.log("=".repeat(80));

  if (!hostWorkGroup) {
    console.log("🔴 CRÍTICO: HostWorkGroup NO existe");
  } else if (!executorMatch) {
    console.log("🔴 CRÍTICO: No hay WorkGroupExecutor que conecte teamId con workGroupId");
    console.log("   - El Cleaner NO verá propiedades vía WGE");
  } else if (executorMatch.status !== "ACTIVE") {
    console.log("🔴 CRÍTICO: WorkGroupExecutor existe pero NO está ACTIVE");
    console.log("   - El Cleaner NO verá propiedades vía WGE");
  } else if (incorrectWgProperties.length > 0) {
    console.log("🔴 PROBLEMA IDENTIFICADO:");
    console.log("   - Hay HostWorkGroupProperties con tenantId INCORRECTO");
    console.log("   - Esto causa que el helper no encuentre las propiedades");
    console.log("   - Solución: Ejecutar 'Editar propiedades' en Host UI para limpiar filas stale");
  } else if (correctWgProperties.length === 0) {
    console.log("🟡 DIAGNÓSTICO:");
    console.log("   - El WorkGroup NO tiene propiedades asignadas");
    console.log("   - Esto NO es un bug, es un problema de datos");
    console.log("   - Solución: Asignar propiedades desde Host UI");
  } else if (propertyIdsFromHelper.length === 0) {
    console.log("🔴 PROBLEMA IDENTIFICADO:");
    console.log("   - Hay HostWorkGroupProperties correctas pero el helper NO retorna propertyIds");
    console.log("   - Posible causa: Propiedades inactivas o WorkGroupExecutor no ACTIVE");
  } else {
    console.log("✅ TODO PARECE CORRECTO:");
    console.log("   - HostWorkGroup existe ✅");
    console.log("   - WorkGroupExecutor ACTIVE existe ✅");
    console.log("   - HostWorkGroupProperties tienen tenantId correcto ✅");
    console.log("   - Helper retorna propertyIds ✅");
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

