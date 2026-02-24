// scripts/debug/diagnose-cleaning-visibility-issue.ts
// Script de diagnóstico para identificar por qué una limpieza no aparece para el TL

import fs from "fs";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
} else if (fs.existsSync(".env")) {
  dotenv.config({ path: ".env" });
}

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === "") {
  console.error("❌ Error: DATABASE_URL no está definido.");
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  console.error("❌ Error: This script cannot run in production");
  process.exit(1);
}

import { PrismaClient, CleaningStatus, AssignmentStatus } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

try {
  neonConfig.webSocketConstructor = ws;
} catch (error) {
  console.warn("Error configurando WebSocket para Neon:", error);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

// IDs de ejemplo (ajustar según el caso real)
// El usuario debe proporcionar estos IDs o el script puede buscarlos
const HOST_USER_EMAIL = process.argv[2] || "ranferi.ia@gmail.com";
const CLEANER_USER_EMAIL = process.argv[3] || "itzel@hausdame.test"; // Ajustar según el caso

async function main() {
  console.log("=".repeat(80));
  console.log("DIAGNÓSTICO: Limpieza no visible para Team Leader");
  console.log("=".repeat(80));
  console.log();

  // PASO 1: Obtener usuarios
  console.log("📋 PASO 1: Identificando usuarios");
  console.log("-".repeat(80));

  const hostUser = await prisma.user.findFirst({
    where: { email: HOST_USER_EMAIL },
    select: { id: true, email: true, tenantId: true, role: true },
  });

  const cleanerUser = await prisma.user.findFirst({
    where: { email: CLEANER_USER_EMAIL },
    select: { id: true, email: true, tenantId: true, role: true },
  });

  if (!hostUser) {
    console.error(`❌ Host user no encontrado: ${HOST_USER_EMAIL}`);
    process.exit(1);
  }

  if (!cleanerUser) {
    console.error(`❌ Cleaner user no encontrado: ${CLEANER_USER_EMAIL}`);
    process.exit(1);
  }

  console.log(`✅ Host User:`);
  console.log(`   ID: ${hostUser.id}`);
  console.log(`   Email: ${hostUser.email}`);
  console.log(`   Tenant ID: ${hostUser.tenantId}`);
  console.log(`   Role: ${hostUser.role}`);

  console.log(`✅ Cleaner User:`);
  console.log(`   ID: ${cleanerUser.id}`);
  console.log(`   Email: ${cleanerUser.email}`);
  console.log(`   Tenant ID: ${cleanerUser.tenantId}`);
  console.log(`   Role: ${cleanerUser.role}`);

  const hostTenantId = hostUser.tenantId;
  const servicesTenantId = cleanerUser.tenantId;

  // Guard clause: abortar si hostTenantId no existe
  if (!hostTenantId) {
    console.error("❌ hostTenantId is null/undefined. Aborting.");
    process.exit(1);
  }

  console.log();
  console.log(`🔍 Tenant IDs:`);
  console.log(`   Host Tenant ID: ${hostTenantId}`);
  console.log(`   Services Tenant ID: ${servicesTenantId}`);
  console.log(`   ¿Son diferentes? ${hostTenantId !== servicesTenantId ? "✅ SÍ (multi-tenant)" : "❌ NO (mismo tenant)"}`);

  // PASO 2: Obtener limpiezas del host que muestran "Pendiente de aceptación"
  console.log();
  console.log("📋 PASO 2: Limpiezas del Host con estado 'Pendiente de aceptación'");
  console.log("-".repeat(80));

  const pendingCleanings = await prisma.cleaning.findMany({
    where: {
      tenantId: hostTenantId,
      assignmentStatus: AssignmentStatus.OPEN,
      assignedMembershipId: null,
      assignedMemberId: null,
      status: { not: CleaningStatus.CANCELLED },
    },
    select: {
      id: true,
      propertyId: true,
      tenantId: true,
      teamId: true,
      assignmentStatus: true,
      assignedMembershipId: true,
      assignedMemberId: true,
      scheduledDate: true,
      status: true,
      needsAttention: true,
      attentionReason: true,
      property: {
        select: {
          id: true,
          name: true,
          shortName: true,
          tenantId: true,
        },
      },
    },
    orderBy: { scheduledDate: "desc" },
    take: 10,
  });

  console.log(`📊 Encontradas ${pendingCleanings.length} limpiezas pendientes de aceptación`);
  if (pendingCleanings.length === 0) {
    console.log("   No hay limpiezas pendientes. Ajustar filtros o buscar por cleaningId específico.");
    process.exit(0);
  }

  // Mostrar primera limpieza como ejemplo
  const exampleCleaning = pendingCleanings[0];
  console.log();
  console.log(`🔍 Ejemplo - Limpieza ID: ${exampleCleaning.id}`);
  console.log(`   Property ID: ${exampleCleaning.propertyId}`);
  console.log(`   Property Name: ${exampleCleaning.property.name || exampleCleaning.property.shortName}`);
  console.log(`   Cleaning Tenant ID: ${exampleCleaning.tenantId}`);
  console.log(`   Property Tenant ID: ${exampleCleaning.property.tenantId}`);
  console.log(`   Team ID: ${exampleCleaning.teamId || "null"}`);
  console.log(`   Assignment Status: ${exampleCleaning.assignmentStatus}`);
  console.log(`   Scheduled Date: ${exampleCleaning.scheduledDate.toISOString()}`);
  console.log(`   Needs Attention: ${exampleCleaning.needsAttention}`);
  console.log(`   Attention Reason: ${exampleCleaning.attentionReason || "null"}`);

  // PASO 3: Obtener memberships del cleaner
  console.log();
  console.log("📋 PASO 3: TeamMemberships del Cleaner");
  console.log("-".repeat(80));

  const cleanerMemberships = await prisma.teamMembership.findMany({
    where: {
      userId: cleanerUser.id,
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
  });

  console.log(`📊 Encontradas ${cleanerMemberships.length} memberships activas`);
  for (const m of cleanerMemberships) {
    console.log(`   - Membership ID: ${m.id}`);
    console.log(`     Team ID: ${m.teamId}`);
    console.log(`     Team Name: ${m.Team?.name || "N/A"}`);
    console.log(`     Team Tenant ID: ${m.Team?.tenantId || "N/A"}`);
    console.log(`     Role: ${m.role}`);
    console.log(`     Status: ${m.status}`);
  }

  if (cleanerMemberships.length === 0) {
    console.error("❌ El cleaner no tiene memberships activas");
    process.exit(1);
  }

  const cleanerTeamIds = cleanerMemberships.map(m => m.teamId);
  const cleanerTeamTenantIds = cleanerMemberships
    .map(m => m.Team?.tenantId)
    .filter((id): id is string => Boolean(id));

  console.log();
  console.log(`🔍 Team IDs del Cleaner: [${cleanerTeamIds.join(", ")}]`);
  console.log(`🔍 Tenant IDs de los Teams: [${cleanerTeamTenantIds.join(", ")}]`);

  // PASO 4: Verificar relación Property-Team
  console.log();
  console.log("📋 PASO 4: Relación Property-Team (PropertyTeam legacy)");
  console.log("-".repeat(80));

  const propertyTeams = await prisma.propertyTeam.findMany({
    where: {
      propertyId: exampleCleaning.propertyId,
      teamId: { in: cleanerTeamIds },
    },
    select: {
      id: true,
      tenantId: true,
      propertyId: true,
      teamId: true,
    },
  });

  console.log(`📊 Encontradas ${propertyTeams.length} relaciones PropertyTeam`);
  for (const pt of propertyTeams) {
    console.log(`   - PropertyTeam ID: ${pt.id}`);
    console.log(`     Property ID: ${pt.propertyId}`);
    console.log(`     Team ID: ${pt.teamId}`);
    console.log(`     Tenant ID: ${pt.tenantId}`);
  }

  // PASO 5: Verificar relación Property-Team vía WorkGroupExecutor
  console.log();
  console.log("📋 PASO 5: Relación Property-Team vía WorkGroupExecutor");
  console.log("-".repeat(80));

  const workGroupExecutors = await prisma.workGroupExecutor.findMany({
    where: {
      teamId: { in: cleanerTeamIds },
      status: "ACTIVE",
    },
    select: {
      id: true,
      hostTenantId: true,
      servicesTenantId: true,
      workGroupId: true,
      teamId: true,
      status: true,
      workGroup: {
        select: {
          id: true,
          name: true,
          tenantId: true,
          status: true,
        },
      },
    },
  });

  console.log(`📊 Encontrados ${workGroupExecutors.length} WorkGroupExecutors activos`);
  for (const wge of workGroupExecutors) {
    console.log(`   - WGE ID: ${wge.id}`);
    console.log(`     Team ID: ${wge.teamId}`);
    console.log(`     Host Tenant ID: ${wge.hostTenantId}`);
    console.log(`     Services Tenant ID: ${wge.servicesTenantId}`);
    console.log(`     Work Group ID: ${wge.workGroupId}`);
    console.log(`     Work Group Name: ${wge.workGroup?.name || "N/A"}`);
    console.log(`     Work Group Status: ${wge.workGroup?.status || "N/A"}`);
  }

  // Obtener propiedades vía WorkGroupExecutor
  const wgeWorkGroupIds = workGroupExecutors
    .filter(wge => wge.hostTenantId === hostTenantId && wge.workGroup?.status === "ACTIVE")
    .map(wge => wge.workGroupId);

  let wgePropertyIds: string[] = [];
  if (wgeWorkGroupIds.length > 0) {
    const hostWorkGroupProperties = await prisma.hostWorkGroupProperty.findMany({
      where: {
        tenantId: hostTenantId,
        workGroupId: { in: wgeWorkGroupIds },
        propertyId: exampleCleaning.propertyId,
        property: {
          isActive: true,
        },
      },
      select: {
        propertyId: true,
        workGroupId: true,
      },
    });
    wgePropertyIds = hostWorkGroupProperties.map(p => p.propertyId);
    console.log();
    console.log(`📊 Propiedades vía WGE para la limpieza:`);
    console.log(`   Work Group IDs: [${wgeWorkGroupIds.join(", ")}]`);
    console.log(`   Property IDs encontrados: [${wgePropertyIds.join(", ")}]`);
    console.log(`   ¿La propiedad está conectada vía WGE? ${wgePropertyIds.includes(exampleCleaning.propertyId) ? "✅ SÍ" : "❌ NO"}`);
  } else {
    console.log();
    console.log(`⚠️  No hay WorkGroupExecutors activos que conecten los teams del cleaner con el tenant del host`);
  }

  // PASO 6: Simular query de cleaner (como en app/cleaner/page.tsx)
  console.log();
  console.log("📋 PASO 6: Simulando query de cleaner (app/cleaner/page.tsx)");
  console.log("-".repeat(80));

  // Obtener tenantIds accesibles (como getAccessibleTeamsForUser)
  const accessibleTenantIds = Array.from(new Set(cleanerTeamTenantIds));
  console.log(`🔍 Tenant IDs accesibles para cleaner: [${accessibleTenantIds.join(", ")}]`);
  console.log(`🔍 Cleaning Tenant ID: ${exampleCleaning.tenantId}`);
  console.log(`   ¿Coinciden? ${accessibleTenantIds.includes(exampleCleaning.tenantId) ? "✅ SÍ" : "❌ NO"}`);

  // Obtener propertyIds vía PropertyTeam (como en app/cleaner/page.tsx línea 215)
  const propertyTeamsForCleaner = await prisma.propertyTeam.findMany({
    where: {
      tenantId: { in: accessibleTenantIds },
      teamId: { in: cleanerTeamIds },
      propertyId: exampleCleaning.propertyId,
    },
    select: {
      propertyId: true,
      tenantId: true,
      teamId: true,
    },
  });

  console.log();
  console.log(`📊 PropertyTeams encontrados para cleaner:`);
  console.log(`   Count: ${propertyTeamsForCleaner.length}`);
  for (const pt of propertyTeamsForCleaner) {
    console.log(`   - Property ID: ${pt.propertyId}, Tenant ID: ${pt.tenantId}, Team ID: ${pt.teamId}`);
  }

  const allowedPropertyIdsViaPropertyTeam = propertyTeamsForCleaner.map(pt => pt.propertyId);
  console.log(`   ¿La propiedad está en allowedPropertyIds? ${allowedPropertyIdsViaPropertyTeam.includes(exampleCleaning.propertyId) ? "✅ SÍ" : "❌ NO"}`);

  // Simular query de limpiezas disponibles
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const simulatedQuery = {
    scheduledDate: { gte: now, lte: sevenDaysLater },
    status: { not: CleaningStatus.CANCELLED },
    tenantId: { in: accessibleTenantIds },
    propertyId: { in: allowedPropertyIdsViaPropertyTeam },
    assignmentStatus: AssignmentStatus.OPEN,
    assignedMembershipId: null,
    assignedMemberId: null,
  };

  console.log();
  console.log(`📊 Query simulado:`);
  console.log(`   tenantId: { in: [${accessibleTenantIds.join(", ")}] }`);
  console.log(`   propertyId: { in: [${allowedPropertyIdsViaPropertyTeam.join(", ")}] }`);
  console.log(`   assignmentStatus: "OPEN"`);
  console.log(`   assignedMembershipId: null`);
  console.log(`   assignedMemberId: null`);

  const simulatedResults = await prisma.cleaning.findMany({
    where: simulatedQuery,
    select: {
      id: true,
      propertyId: true,
      tenantId: true,
    },
  });

  console.log();
  console.log(`📊 Resultados de query simulado:`);
  console.log(`   Encontradas: ${simulatedResults.length} limpiezas`);
  console.log(`   ¿Incluye la limpieza de ejemplo? ${simulatedResults.some(c => c.id === exampleCleaning.id) ? "✅ SÍ" : "❌ NO"}`);

  // PASO 7: Comparar con getCleanerCleanings (que usa WGE)
  console.log();
  console.log("📋 PASO 7: Comparando con getCleanerCleanings (usa WGE)");
  console.log("-".repeat(80));

  // Simular getPropertiesForCleanerTeamsViaWGE
  const { getPropertiesForCleanerTeamsViaWGE } = await import("@/lib/workgroups/getPropertiesForCleanerTeamViaWGE");
  const wgePropertyIdsForCleaner = await getPropertiesForCleanerTeamsViaWGE(cleanerTeamIds);

  console.log(`📊 Property IDs vía WGE: [${wgePropertyIdsForCleaner.join(", ")}]`);
  console.log(`   ¿La propiedad está vía WGE? ${wgePropertyIdsForCleaner.includes(exampleCleaning.propertyId) ? "✅ SÍ" : "❌ NO"}`);

  // Simular query con WGE propertyIds
  const simulatedQueryWithWGE = {
    scheduledDate: { gte: now, lte: sevenDaysLater },
    status: { not: CleaningStatus.CANCELLED },
    tenantId: { in: accessibleTenantIds },
    propertyId: { in: wgePropertyIdsForCleaner },
    assignmentStatus: AssignmentStatus.OPEN,
    assignedMembershipId: null,
    assignedMemberId: null,
  };

  const simulatedResultsWithWGE = await prisma.cleaning.findMany({
    where: simulatedQueryWithWGE,
    select: {
      id: true,
      propertyId: true,
      tenantId: true,
    },
  });

  console.log();
  console.log(`📊 Resultados con WGE propertyIds:`);
  console.log(`   Encontradas: ${simulatedResultsWithWGE.length} limpiezas`);
  console.log(`   ¿Incluye la limpieza de ejemplo? ${simulatedResultsWithWGE.some(c => c.id === exampleCleaning.id) ? "✅ SÍ" : "❌ NO"}`);

  // PASO 8: Diagnóstico final
  console.log();
  console.log("=".repeat(80));
  console.log("📋 DIAGNÓSTICO FINAL");
  console.log("=".repeat(80));

  const issues: string[] = [];

  // Issue 1: Tenant ID mismatch
  if (!accessibleTenantIds.includes(exampleCleaning.tenantId)) {
    issues.push(`❌ MISMATCH DE TENANT ID: La limpieza está en tenant "${exampleCleaning.tenantId}" (host) pero el cleaner solo accede a tenants [${accessibleTenantIds.join(", ")}] (services). Las queries filtran por tenantId y excluyen la limpieza.`);
  }

  // Issue 2: PropertyTeam no existe
  if (propertyTeamsForCleaner.length === 0 && wgePropertyIdsForCleaner.length === 0) {
    issues.push(`❌ SIN CONEXIÓN PROPERTY-TEAM: No existe PropertyTeam ni WorkGroupExecutor que conecte la propiedad "${exampleCleaning.propertyId}" con los teams del cleaner [${cleanerTeamIds.join(", ")}].`);
  }

  // Issue 3: Solo PropertyTeam, no WGE
  if (propertyTeamsForCleaner.length > 0 && wgePropertyIdsForCleaner.length === 0) {
    issues.push(`⚠️  SOLO PROPERTYTEAM: La propiedad está conectada vía PropertyTeam (legacy) pero NO vía WorkGroupExecutor. Algunas páginas usan solo PropertyTeam, otras usan WGE primero.`);
  }

  // Issue 4: Solo WGE, no PropertyTeam
  if (propertyTeamsForCleaner.length === 0 && wgePropertyIdsForCleaner.length > 0) {
    issues.push(`⚠️  SOLO WGE: La propiedad está conectada vía WorkGroupExecutor pero NO vía PropertyTeam. Las páginas que solo usan PropertyTeam (app/cleaner/page.tsx, app/cleaner/cleanings/available/page.tsx) NO verán la limpieza.`);
  }

  // Issue 5: Filtro de tenantId incorrecto
  if (accessibleTenantIds.length > 0 && !accessibleTenantIds.includes(exampleCleaning.tenantId)) {
    issues.push(`❌ FILTRO TENANT ID INCORRECTO: Las queries usan "tenantId: { in: [${accessibleTenantIds.join(", ")}] }" pero la limpieza está en "${exampleCleaning.tenantId}". Deberían incluir el hostTenantId derivado de WorkGroupExecutor.`);
  }

  if (issues.length === 0) {
    console.log("✅ No se detectaron problemas obvios. Revisar otros filtros (fecha, assignmentStatus, etc.)");
  } else {
    console.log("🔍 PROBLEMAS DETECTADOS:");
    for (const issue of issues) {
      console.log(`   ${issue}`);
    }
  }

  console.log();
  console.log("=".repeat(80));
  console.log("📋 EVIDENCIA TÉCNICA");
  console.log("=".repeat(80));
  console.log();
  console.log("Archivos afectados:");
  console.log(`   1. app/cleaner/page.tsx (línea 215-240):`);
  console.log(`      - Usa PropertyTeam.findMany con tenantId: { in: tenantIds }`);
  console.log(`      - tenantIds viene de getAccessibleTeamsForUser (solo servicesTenantId)`);
  console.log(`      - Query de cleaning usa tenantId: { in: tenantIds } (línea 239)`);
  console.log(`      - NO usa getPropertiesForCleanerTeamsViaWGE`);
  console.log();
  console.log(`   2. app/cleaner/cleanings/available/page.tsx (línea 70-91):`);
  console.log(`      - Usa PropertyTeam.findMany con tenantId: { in: tenantIds }`);
  console.log(`      - Query de cleaning usa tenantId: { in: tenantIds } (línea 91)`);
  console.log(`      - NO usa getPropertiesForCleanerTeamsViaWGE`);
  console.log();
  console.log(`   3. lib/cleaner/getCleanerCleanings.ts (línea 51-54):`);
  console.log(`      - SÍ usa getPropertiesForCleanerTeamsViaWGE primero`);
  console.log(`      - Luego fallback a PropertyTeam`);
  console.log(`      - Pero también usa tenantId: { in: tenantIds } (línea 92)`);
  console.log();
  console.log(`   4. lib/cleaner/getAccessibleTenantIdsForUser.ts (línea 3-18):`);
  console.log(`      - Devuelve tenantIds de los Teams (servicesTenantId)`);
  console.log(`      - NO incluye hostTenantId derivado de WorkGroupExecutor`);
  console.log();
  console.log("=".repeat(80));
}

main()
  .catch((e) => {
    console.error("❌ Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

