// scripts/debug/delete-demo-tenant-and-user.ts
// Script para eliminar de forma segura un tenant demo y usuario específico
// Por defecto: DRY-RUN (solo lectura)
// Con --apply: ejecuta borrado real (requiere ALLOW_SEED_WRITES=1)

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

// ===== BLINDAJE: No permitir en producción =====
if (process.env.NODE_ENV === "production") {
  console.error("❌ Error: This script cannot run in production (NODE_ENV=production)");
  console.error("   This script is designed only for development.");
  process.exit(1);
}

// ===== Parsear argumentos =====
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const force = args.includes("--force");

// ===== IDs a eliminar =====
const USER_ID = "cmkrezj830001boo75u6nflgz";
const TENANT_ID = "cmkreziw50000boo7oi3t9cuc";

// ===== Sanitizar DATABASE_URL para logs =====
function sanitizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "***";
    }
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url.substring(0, 20) + "...";
  }
}

function getDatabaseFingerprint(url: string): { host: string; dbName: string } {
  try {
    const parsed = new URL(url);
    const dbName = parsed.pathname ? parsed.pathname.replace(/^\//, "") : "unknown";
    return {
      host: parsed.host || "unknown",
      dbName: dbName || "unknown",
    };
  } catch {
    return { host: "unknown", dbName: "unknown" };
  }
}

// ===== Logs de inicio =====
const dbUrl = process.env.DATABASE_URL!;
const dbFingerprint = getDatabaseFingerprint(dbUrl);

console.log("=".repeat(80));
console.log("DELETE DEMO TENANT AND USER - Modo Seguro");
console.log("=".repeat(80));
console.log(`Script: delete-demo-tenant-and-user.ts`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || "undefined"}`);
console.log(`Database fingerprint:`);
console.log(`  Host: ${dbFingerprint.host}`);
console.log(`  Database: ${dbFingerprint.dbName}`);
console.log(`  Full URL (sanitized): ${sanitizeDatabaseUrl(dbUrl)}`);
console.log(`Target IDs:`);
console.log(`  User ID: ${USER_ID}`);
console.log(`  Tenant ID: ${TENANT_ID}`);
console.log(`Flags:`);
console.log(`  --apply: ${apply ? "✅ YES (WILL DELETE)" : "❌ NO (DRY-RUN)"}`);
console.log(`  --force: ${force ? "✅ YES" : "❌ NO"}`);
if (apply) {
  if (process.env.ALLOW_SEED_WRITES === "1") {
    console.log(`Environment gates:`);
    console.log(`  ALLOW_SEED_WRITES: ✅ YES`);
  } else {
    console.error("❌ Error: --apply requires ALLOW_SEED_WRITES=1");
    console.error("   Example: ALLOW_SEED_WRITES=1 npx tsx scripts/debug/delete-demo-tenant-and-user.ts --apply");
    process.exit(1);
  }
}
console.log("=".repeat(80));
console.log();

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import path from "path";

try {
  neonConfig.webSocketConstructor = ws;
} catch (error) {
  console.warn("Error configurando WebSocket para Neon:", error);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

interface ReferenceCount {
  model: string;
  filter: string;
  count: number;
  notes: string;
  isCritical: boolean;
}

const referenceCounts: ReferenceCount[] = [];

async function countReferences(model: string, filter: any, notes: string, isCritical: boolean = false): Promise<number> {
  try {
    const count = await (prisma as any)[model].count({ where: filter });
    referenceCounts.push({ model, filter: JSON.stringify(filter), count, notes, isCritical });
    return count;
  } catch (error: any) {
    referenceCounts.push({ model, filter: JSON.stringify(filter), count: -1, notes: `N/A (${error.message})`, isCritical });
    return -1;
  }
}

async function main() {
  console.log("📋 PASO 1: Validaciones Iniciales (READ-ONLY)");
  console.log("-".repeat(80));

  // 1) Verificar existencia
  const user = await prisma.user.findUnique({
    where: { id: USER_ID },
    select: { id: true, email: true, tenantId: true, role: true, createdAt: true },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: TENANT_ID },
    select: { id: true, name: true, slug: true, createdAt: true },
  });

  if (!user) {
    console.error(`❌ Error: User with ID "${USER_ID}" not found.`);
    process.exit(1);
  }

  if (!tenant) {
    console.error(`❌ Error: Tenant with ID "${TENANT_ID}" not found.`);
    process.exit(1);
  }

  console.log(`✅ User encontrado:`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Tenant ID: ${user.tenantId || "null"}`);
  console.log(`   Created At: ${user.createdAt.toISOString()}`);

  console.log(`✅ Tenant encontrado:`);
  console.log(`   ID: ${tenant.id}`);
  console.log(`   Name: ${tenant.name}`);
  console.log(`   Slug: ${tenant.slug}`);
  console.log(`   Created At: ${tenant.createdAt.toISOString()}`);

  // 2) Validar coherencia (endurecido)
  const userTenantMismatch = user.tenantId !== TENANT_ID;
  if (userTenantMismatch) {
    console.warn(`⚠️  WARNING: user.tenantId (${user.tenantId}) !== TENANT_ID (${TENANT_ID})`);
    console.warn(`   Esto puede indicar que el usuario pertenece a otro tenant.`);
    if (!force) {
      console.error(`❌ ABORT: Coherencia user.tenantId fallida.`);
      console.error(`   Use --force para continuar (NO RECOMMENDED).`);
      process.exit(1);
    } else {
      console.warn(`   ⚠️  FORCE MODE: Proceeding despite tenant mismatch.`);
    }
  }

  // 3) Sanity checks
  const isDemoTenant = tenant.slug === "hausdame-demo" || tenant.name.toLowerCase().includes("demo");
  const isDemoUser = user.email.endsWith("@hausdame.test");

  if (!isDemoTenant) {
    console.error(`❌ CRITICAL WARNING: Tenant does NOT appear to be demo:`);
    console.error(`   Slug: "${tenant.slug}" (expected: "hausdame-demo")`);
    console.error(`   Name: "${tenant.name}" (expected to contain "Demo")`);
    if (!force) {
      console.error(`   Use --force to override (NOT RECOMMENDED).`);
      process.exit(1);
    } else {
      console.warn(`   ⚠️  FORCE MODE: Proceeding despite non-demo tenant.`);
    }
  }

  if (!isDemoUser) {
    console.error(`❌ CRITICAL WARNING: User email does NOT appear to be demo:`);
    console.error(`   Email: "${user.email}" (expected to end with "@hausdame.test")`);
    if (!force) {
      console.error(`   Use --force to override (NOT RECOMMENDED).`);
      process.exit(1);
    } else {
      console.warn(`   ⚠️  FORCE MODE: Proceeding despite non-demo user.`);
    }
  }

  console.log();
  console.log("📋 PASO 2: Mapeo de Impacto (Referencias)");
  console.log("-".repeat(80));

  // TENANT-SCOPED references
  console.log("🔍 Contando referencias por tenantId...");
  await countReferences("user", { tenantId: TENANT_ID }, "Users en tenant", false);
  await countReferences("team", { tenantId: TENANT_ID }, "Teams en tenant", false);
  await countReferences("teamMember", { tenantId: TENANT_ID }, "TeamMembers en tenant", false);
  // TeamMembership se cuenta por teamId -> team.tenantId
  const teamsInTenant = await prisma.team.findMany({ where: { tenantId: TENANT_ID }, select: { id: true } });
  const teamIds = teamsInTenant.map(t => t.id);
  if (teamIds.length > 0) {
    await countReferences("teamMembership", { teamId: { in: teamIds } }, "TeamMemberships en tenant", false);
  } else {
    referenceCounts.push({ model: "teamMembership", filter: "teamId in []", count: 0, notes: "TeamMemberships en tenant (no teams)", isCritical: false });
  }
  await countReferences("property", { tenantId: TENANT_ID }, "Properties en tenant", true);
  await countReferences("reservation", { tenantId: TENANT_ID }, "Reservations en tenant", true);
  await countReferences("cleaning", { tenantId: TENANT_ID }, "Cleanings en tenant", true);
  await countReferences("hostWorkGroup", { tenantId: TENANT_ID }, "HostWorkGroups en tenant", false);
  await countReferences("hostWorkGroupProperty", { tenantId: TENANT_ID }, "HostWorkGroupProperties en tenant", false);
  await countReferences("workGroupExecutor", { hostTenantId: TENANT_ID }, "WorkGroupExecutors (host)", false);
  await countReferences("workGroupExecutor", { servicesTenantId: TENANT_ID }, "WorkGroupExecutors (services)", false);
  await countReferences("hostWorkGroupInvite", { tenantId: TENANT_ID }, "HostWorkGroupInvites en tenant", false);
  await countReferences("chatThread", { tenantId: TENANT_ID }, "ChatThreads en tenant", true);
  await countReferences("chatMessage", { tenantId: TENANT_ID }, "ChatMessages en tenant", true);
  // ChatParticipant se cuenta por threadId -> thread.tenantId
  const threadsInTenant = await prisma.chatThread.findMany({ where: { tenantId: TENANT_ID }, select: { id: true } });
  const threadIds = threadsInTenant.map(t => t.id);
  if (threadIds.length > 0) {
    await countReferences("chatParticipant", { threadId: { in: threadIds } }, "ChatParticipants en tenant", false);
  } else {
    referenceCounts.push({ model: "chatParticipant", filter: "threadId in []", count: 0, notes: "ChatParticipants en tenant (no threads)", isCritical: false });
  }
  await countReferences("propertyInvite", { tenantId: TENANT_ID }, "PropertyInvites en tenant", false);
  await countReferences("propertyApplication", { tenantId: TENANT_ID }, "PropertyApplications en tenant", false);
  await countReferences("propertyOpening", { tenantId: TENANT_ID }, "PropertyOpenings en tenant", false);
  await countReferences("asset", { tenantId: TENANT_ID }, "Assets en tenant", false);
  await countReferences("cleaningMedia", { tenantId: TENANT_ID }, "CleaningMedia en tenant", false);
  await countReferences("cleaningAssignee", { tenantId: TENANT_ID }, "CleaningAssignees en tenant", false);
  await countReferences("cleaningView", { tenantId: TENANT_ID }, "CleaningViews en tenant", false);
  await countReferences("inventoryItem", { tenantId: TENANT_ID }, "InventoryItems en tenant", false);
  await countReferences("inventoryLine", { tenantId: TENANT_ID }, "InventoryLines en tenant", false);
  await countReferences("inventoryReview", { tenantId: TENANT_ID }, "InventoryReviews en tenant", false);
  await countReferences("inventoryReport", { tenantId: TENANT_ID }, "InventoryReports en tenant", false);
  await countReferences("lock", { tenantId: TENANT_ID }, "Locks en tenant", false);
  await countReferences("lockCode", { tenantId: TENANT_ID }, "LockCodes en tenant", false);
  await countReferences("metricEvent", { tenantId: TENANT_ID }, "MetricEvents en tenant", false);

  // USER-SCOPED references
  console.log("🔍 Contando referencias por userId...");
  await countReferences("teamMembership", { userId: USER_ID }, "TeamMemberships del usuario", false);
  await countReferences("cleaning", { assignedToId: USER_ID }, "Cleanings asignadas al usuario", true);
  await countReferences("cleaning", { assignedMemberId: USER_ID }, "Cleanings asignadas (memberId)", true);
  await countReferences("chatParticipant", { userId: USER_ID }, "ChatParticipants del usuario", false);
  await countReferences("chatMessage", { senderUserId: USER_ID }, "ChatMessages del usuario", true);
  await countReferences("property", { userId: USER_ID }, "Properties del usuario", true);
  await countReferences("propertyAdmin", { userId: USER_ID }, "PropertyAdmins del usuario", false);
  await countReferences("propertyCleaner", { userId: USER_ID }, "PropertyCleaners del usuario", false);
  await countReferences("propertyHandyman", { userId: USER_ID }, "PropertyHandymen del usuario", false);
  await countReferences("propertyInvite", { createdByUserId: USER_ID }, "PropertyInvites creadas por usuario", false);
  await countReferences("propertyInvite", { claimedByUserId: USER_ID }, "PropertyInvites reclamadas por usuario", false);
  await countReferences("propertyApplication", { applicantUserId: USER_ID }, "PropertyApplications del usuario", false);
  await countReferences("propertyOpening", { createdByUserId: USER_ID }, "PropertyOpenings creadas por usuario", false);
  await countReferences("hostWorkGroupInvite", { createdByUserId: USER_ID }, "HostWorkGroupInvites creadas por usuario", false);
  await countReferences("hostWorkGroupInvite", { claimedByUserId: USER_ID }, "HostWorkGroupInvites reclamadas por usuario", false);
  await countReferences("teamInvite", { createdByUserId: USER_ID }, "TeamInvites creadas por usuario", false);
  await countReferences("teamInvite", { claimedByUserId: USER_ID }, "TeamInvites reclamadas por usuario", false);
  await countReferences("team", { inactivatedByUserId: USER_ID }, "Teams inactivados por usuario", false);
  await countReferences("teamMember", { userId: USER_ID }, "TeamMembers del usuario", false);
  await countReferences("cleanerProfile", { userId: USER_ID }, "CleanerProfile del usuario", false);
  await countReferences("cleanerReview", { cleanerUserId: USER_ID }, "CleanerReviews (como cleaner)", false);
  await countReferences("cleanerReview", { reviewerUserId: USER_ID }, "CleanerReviews (como reviewer)", false);
  await countReferences("inventoryReview", { reviewedByUserId: USER_ID }, "InventoryReviews revisadas por usuario", false);
  await countReferences("inventoryReport", { createdByUserId: USER_ID }, "InventoryReports creadas por usuario", false);
  await countReferences("inventoryReport", { resolvedByUserId: USER_ID }, "InventoryReports resueltas por usuario", false);
  await countReferences("asset", { createdByUserId: USER_ID }, "Assets creados por usuario", false);
  await countReferences("cleaningVerificationDocument", { reviewedByUserId: USER_ID }, "CleanerVerificationDocuments revisadas por usuario", false);

  // Mostrar tabla de referencias
  console.log();
  console.log("📊 Tabla de Referencias:");
  console.log("-".repeat(80));
  console.log("Model".padEnd(35) + "Filter".padEnd(30) + "Count".padEnd(10) + "Notes");
  console.log("-".repeat(80));
  for (const ref of referenceCounts) {
    const modelStr = ref.model.padEnd(35);
    const filterStr = ref.filter.substring(0, 28).padEnd(30);
    const countStr = ref.count === -1 ? "N/A" : ref.count.toString();
    const countPadded = countStr.padEnd(10);
    const notesStr = ref.isCritical ? `⚠️ CRITICAL: ${ref.notes}` : ref.notes;
    console.log(`${modelStr}${filterStr}${countPadded}${notesStr}`);
  }
  console.log("-".repeat(80));

  // 3) Decisión "SAFE TO DELETE?"
  console.log();
  console.log("📋 PASO 3: Decisión 'SAFE TO DELETE?'");
  console.log("-".repeat(80));

  const criticalRefs = referenceCounts.filter(r => r.isCritical && r.count > 0);
  const criticalRefsNA = referenceCounts.filter(r => r.isCritical && r.count === -1);
  const nonCriticalRefs = referenceCounts.filter(r => !r.isCritical && r.count > 0);

  // Tratar N/A en referencias críticas como BLOQUEANTE
  if (criticalRefsNA.length > 0) {
    console.error("❌ ABORT: Could not verify critical references (N/A):");
    for (const ref of criticalRefsNA) {
      console.error(`   - ${ref.model}: N/A (${ref.notes})`);
    }
    console.error("   No se puede verificar si hay referencias críticas. Abortando por seguridad.");
    process.exit(1);
  }

  if (criticalRefs.length > 0) {
    console.error("❌ ABORT: Referencias CRÍTICAS encontradas:");
    for (const ref of criticalRefs) {
      console.error(`   - ${ref.model}: ${ref.count} (${ref.notes})`);
    }
    console.error("   Estas referencias indican uso real y NO pueden ser borradas.");
    console.error("   Incluso con --force, el borrado será abortado.");
    process.exit(1);
  }

  if (nonCriticalRefs.length > 0) {
    console.warn("⚠️  Referencias NO CRÍTICAS encontradas:");
    for (const ref of nonCriticalRefs) {
      console.warn(`   - ${ref.model}: ${ref.count} (${ref.notes})`);
    }
    if (!force) {
      console.warn("   Use --force para permitir borrado con referencias no críticas.");
      console.log();
      console.log("❌ DECISIÓN: NOT SAFE TO DELETE (hay referencias no críticas)");
      console.log("   Ejecuta con --force si estás seguro.");
      process.exit(0);
    } else {
      console.warn("   ⚠️  FORCE MODE: Procediendo con borrado a pesar de referencias no críticas.");
    }
  }

  // Determinar si es seguro borrar (considerando coherencia también)
  const safeToDelete = criticalRefs.length === 0 && criticalRefsNA.length === 0 && 
                       (nonCriticalRefs.length === 0 || force) &&
                       (userTenantMismatch === false || force);

  if (safeToDelete) {
    console.log("✅ DECISIÓN: SAFE TO DELETE");
  } else {
    console.log("❌ DECISIÓN: NOT SAFE TO DELETE");
    if (userTenantMismatch && !force) {
      console.log("   Razón: user.tenantId no coincide con TENANT_ID");
    }
  }
  console.log();

  // Generar reporte también en DRY-RUN
  await generateReport(user, tenant, referenceCounts, criticalRefs, nonCriticalRefs, apply, force, dbFingerprint, userTenantMismatch);

  // 4) Borrado (solo si --apply)
  if (!apply) {
    console.log("=".repeat(80));
    console.log("DRY-RUN completado. No se borró nada.");
    console.log("Para ejecutar borrado real, usa: --apply");
    console.log("Ejemplo: ALLOW_SEED_WRITES=1 npx tsx scripts/debug/delete-demo-tenant-and-user.ts --apply");
    console.log("=".repeat(80));
    return;
  }

  console.log("📋 PASO 4: Borrado (APPLY MODE)");
  console.log("-".repeat(80));

  console.log("📝 PLAN: Ejecutando borrado en transacción...");
  console.log("   1. Borrar recursos del tenant NO críticos (orden hijos->padre)");
  console.log("   2. Borrar referencias del usuario (teamMembership, chatParticipant, cleanerProfile, etc.)");
  console.log("   3. Borrar usuario");
  console.log("   4. Borrar tenant");

  try {
    await prisma.$transaction(async (tx) => {
      // A) Borrar recursos del tenant NO críticos explícitamente (orden hijos->padre)
      // IMPORTANTE: Esto debe ir ANTES de borrar el usuario para evitar FK constraints
      if (force || nonCriticalRefs.length > 0) {
        console.log("   🔹 Borrando recursos del tenant (no críticos)...");
        
        // Obtener IDs necesarios para borrados relacionados
        const teamsInTenant = await tx.team.findMany({ where: { tenantId: TENANT_ID }, select: { id: true } });
        const teamIds = teamsInTenant.map(t => t.id);
        
        const threadsInTenant = await tx.chatThread.findMany({ where: { tenantId: TENANT_ID }, select: { id: true } });
        const threadIds = threadsInTenant.map(t => t.id);

        // Borrar en orden hijos->padre
        // TeamMembership (por teamIds)
        if (teamIds.length > 0) {
          const tmCount = await tx.teamMembership.deleteMany({ where: { teamId: { in: teamIds } } });
          if (tmCount.count > 0) console.log(`      ✅ TeamMemberships: ${tmCount.count}`);
        }

        // TeamMemberScheduleDay
        if (teamIds.length > 0) {
          const teamMembers = await tx.teamMember.findMany({ where: { teamId: { in: teamIds } }, select: { id: true } });
          const memberIds = teamMembers.map(m => m.id);
          if (memberIds.length > 0) {
            const tmsdCount = await tx.teamMemberScheduleDay.deleteMany({ where: { memberId: { in: memberIds } } });
            if (tmsdCount.count > 0) console.log(`      ✅ TeamMemberScheduleDays: ${tmsdCount.count}`);
          }
        }

        // TeamMember
        if (teamIds.length > 0) {
          const tmemCount = await tx.teamMember.deleteMany({ where: { teamId: { in: teamIds } } });
          if (tmemCount.count > 0) console.log(`      ✅ TeamMembers: ${tmemCount.count}`);
        }

        // TeamInvite
        if (teamIds.length > 0) {
          const tiCount = await tx.teamInvite.deleteMany({ where: { teamId: { in: teamIds } } });
          if (tiCount.count > 0) console.log(`      ✅ TeamInvites: ${tiCount.count}`);
        }

        // Team
        const teamCount = await tx.team.deleteMany({ where: { tenantId: TENANT_ID } });
        if (teamCount.count > 0) console.log(`      ✅ Teams: ${teamCount.count}`);

        // HostWorkGroupInvite
        const hwgiCount = await tx.hostWorkGroupInvite.deleteMany({ where: { tenantId: TENANT_ID } });
        if (hwgiCount.count > 0) console.log(`      ✅ HostWorkGroupInvites: ${hwgiCount.count}`);

        // HostWorkGroupProperty
        const hwgpCount = await tx.hostWorkGroupProperty.deleteMany({ where: { tenantId: TENANT_ID } });
        if (hwgpCount.count > 0) console.log(`      ✅ HostWorkGroupProperties: ${hwgpCount.count}`);

        // WorkGroupExecutor (host)
        const wgeHostCount = await tx.workGroupExecutor.deleteMany({ where: { hostTenantId: TENANT_ID } });
        if (wgeHostCount.count > 0) console.log(`      ✅ WorkGroupExecutors (host): ${wgeHostCount.count}`);

        // WorkGroupExecutor (services)
        const wgeServicesCount = await tx.workGroupExecutor.deleteMany({ where: { servicesTenantId: TENANT_ID } });
        if (wgeServicesCount.count > 0) console.log(`      ✅ WorkGroupExecutors (services): ${wgeServicesCount.count}`);

        // HostWorkGroup
        const hwgCount = await tx.hostWorkGroup.deleteMany({ where: { tenantId: TENANT_ID } });
        if (hwgCount.count > 0) console.log(`      ✅ HostWorkGroups: ${hwgCount.count}`);

        // ChatParticipant (por threadIds) - NO crítico, pero solo si no hay threads críticos
        // Nota: Si hay chatThreads/chatMessages críticos, ya abortó antes
        if (threadIds.length > 0) {
          const cpCount = await tx.chatParticipant.deleteMany({ where: { threadId: { in: threadIds } } });
          if (cpCount.count > 0) console.log(`      ✅ ChatParticipants: ${cpCount.count}`);
        }

        // NOTA: ChatMessage y ChatThread son CRÍTICOS y NO deben borrarse aquí
        // Si existen, el script ya abortó antes. Si llegamos aquí, no existen.

        // PropertyInvite
        const piCount = await tx.propertyInvite.deleteMany({ where: { tenantId: TENANT_ID } });
        if (piCount.count > 0) console.log(`      ✅ PropertyInvites: ${piCount.count}`);

        // PropertyApplication
        const paCount = await tx.propertyApplication.deleteMany({ where: { tenantId: TENANT_ID } });
        if (paCount.count > 0) console.log(`      ✅ PropertyApplications: ${paCount.count}`);

        // PropertyOpening
        const poCount = await tx.propertyOpening.deleteMany({ where: { tenantId: TENANT_ID } });
        if (poCount.count > 0) console.log(`      ✅ PropertyOpenings: ${poCount.count}`);

        // InventoryReviewItemChange
        const iricCount = await tx.inventoryReviewItemChange.deleteMany({ where: { tenantId: TENANT_ID } });
        if (iricCount.count > 0) console.log(`      ✅ InventoryReviewItemChanges: ${iricCount.count}`);

        // InventoryEvidence
        const ieCount = await tx.inventoryEvidence.deleteMany({ where: { tenantId: TENANT_ID } });
        if (ieCount.count > 0) console.log(`      ✅ InventoryEvidence: ${ieCount.count}`);

        // InventoryReport
        const irCount = await tx.inventoryReport.deleteMany({ where: { tenantId: TENANT_ID } });
        if (irCount.count > 0) console.log(`      ✅ InventoryReports: ${irCount.count}`);

        // InventoryReview
        const invrCount = await tx.inventoryReview.deleteMany({ where: { tenantId: TENANT_ID } });
        if (invrCount.count > 0) console.log(`      ✅ InventoryReviews: ${invrCount.count}`);

        // InventoryLine
        const ilCount = await tx.inventoryLine.deleteMany({ where: { tenantId: TENANT_ID } });
        if (ilCount.count > 0) console.log(`      ✅ InventoryLines: ${ilCount.count}`);

        // InventoryItemAsset
        const iiaCount = await tx.inventoryItemAsset.deleteMany({ where: { tenantId: TENANT_ID } });
        if (iiaCount.count > 0) console.log(`      ✅ InventoryItemAssets: ${iiaCount.count}`);

        // InventoryItem
        const iiCount = await tx.inventoryItem.deleteMany({ where: { tenantId: TENANT_ID } });
        if (iiCount.count > 0) console.log(`      ✅ InventoryItems: ${iiCount.count}`);

        // CleaningMedia
        const cmMediaCount = await tx.cleaningMedia.deleteMany({ where: { tenantId: TENANT_ID } });
        if (cmMediaCount.count > 0) console.log(`      ✅ CleaningMedia: ${cmMediaCount.count}`);

        // CleaningView
        const cvCount = await tx.cleaningView.deleteMany({ where: { tenantId: TENANT_ID } });
        if (cvCount.count > 0) console.log(`      ✅ CleaningViews: ${cvCount.count}`);

        // CleaningAssignee
        const caCount = await tx.cleaningAssignee.deleteMany({ where: { tenantId: TENANT_ID } });
        if (caCount.count > 0) console.log(`      ✅ CleaningAssignees: ${caCount.count}`);

        // CleaningChecklistItem
        const cciCount = await tx.cleaningChecklistItem.deleteMany({ where: { tenantId: TENANT_ID } });
        if (cciCount.count > 0) console.log(`      ✅ CleaningChecklistItems: ${cciCount.count}`);

        // PropertyChecklistItem
        const pciCount = await tx.propertyChecklistItem.deleteMany({ where: { tenantId: TENANT_ID } });
        if (pciCount.count > 0) console.log(`      ✅ PropertyChecklistItems: ${pciCount.count}`);

        // LockCode
        const lcCount = await tx.lockCode.deleteMany({ where: { tenantId: TENANT_ID } });
        if (lcCount.count > 0) console.log(`      ✅ LockCodes: ${lcCount.count}`);

        // Lock
        const lockCount = await tx.lock.deleteMany({ where: { tenantId: TENANT_ID } });
        if (lockCount.count > 0) console.log(`      ✅ Locks: ${lockCount.count}`);

        // MetricEvent
        const meCount = await tx.metricEvent.deleteMany({ where: { tenantId: TENANT_ID } });
        if (meCount.count > 0) console.log(`      ✅ MetricEvents: ${meCount.count}`);

        // Asset (último, puede tener referencias)
        const assetCount = await tx.asset.deleteMany({ where: { tenantId: TENANT_ID } });
        if (assetCount.count > 0) console.log(`      ✅ Assets: ${assetCount.count}`);
      }

      // B) Borrar referencias del usuario (ANTES de borrar el usuario para evitar P2003)
      console.log("   🔹 Borrando referencias del usuario...");
      
      // CleanerProfile (FK fuerte a User, debe borrarse antes)
      const cpProfileCount = await tx.cleanerProfile.deleteMany({ where: { userId: USER_ID } });
      if (cpProfileCount.count > 0) console.log(`      ✅ CleanerProfile: ${cpProfileCount.count}`);

      // TeamMembership
      const tmCount = await tx.teamMembership.deleteMany({ where: { userId: USER_ID } });
      if (tmCount.count > 0) console.log(`      ✅ TeamMemberships: ${tmCount.count}`);

      // ChatParticipant (referencias directas del usuario)
      const cpCount = await tx.chatParticipant.deleteMany({ where: { userId: USER_ID } });
      if (cpCount.count > 0) console.log(`      ✅ ChatParticipants: ${cpCount.count}`);

      // C) Borrar usuario
      console.log("   🔹 Borrando usuario...");
      await tx.user.delete({ where: { id: USER_ID } });
      console.log(`      ✅ Usuario ${USER_ID} eliminado`);

      // D) Borrar tenant (esto debería cascadear todo lo demás)
      console.log("   🔹 Borrando tenant...");
      await tx.tenant.delete({ where: { id: TENANT_ID } });
      console.log(`      ✅ Tenant ${TENANT_ID} eliminado`);
    });

    console.log();
    console.log("✅ Borrado completado exitosamente");

    // Re-check
    console.log();
    console.log("🔍 Verificación post-borrado:");
    const userAfter = await prisma.user.findUnique({ where: { id: USER_ID } });
    const tenantAfter = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });

    if (userAfter) {
      console.error(`❌ ERROR: Usuario aún existe después del borrado`);
    } else {
      console.log(`✅ Usuario ${USER_ID} confirmado eliminado`);
    }

    if (tenantAfter) {
      console.error(`❌ ERROR: Tenant aún existe después del borrado`);
    } else {
      console.log(`✅ Tenant ${TENANT_ID} confirmado eliminado`);
    }

  } catch (error: any) {
    console.error("❌ Error durante el borrado:", error.message);
    if (error.code === "P2003") {
      console.error("   Esto indica una violación de foreign key.");
      console.error("   Revisa las referencias críticas antes de intentar borrar.");
    }
    process.exit(1);
  }


  console.log();
  console.log("=".repeat(80));
  console.log("✅ Proceso completado");
  console.log("=".repeat(80));
}

async function generateReport(
  user: any,
  tenant: any,
  referenceCounts: ReferenceCount[],
  criticalRefs: ReferenceCount[],
  nonCriticalRefs: ReferenceCount[],
  applied: boolean,
  forceFlag: boolean,
  dbFp: { host: string; dbName: string },
  userTenantMismatch: boolean
) {
  const reportPath = path.join(process.cwd(), "docs/debug/DELETE_DEMO_TENANT_AND_USER_REPORT.md");
  const reportDir = path.dirname(reportPath);

  // Crear directorio si no existe
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const isDemoTenant = tenant.slug === "hausdame-demo" || tenant.name.toLowerCase().includes("demo");
  const isDemoUser = user.email.endsWith("@hausdame.test");
  const safeToDelete = criticalRefs.length === 0 && (nonCriticalRefs.length === 0 || forceFlag) && 
                       (!userTenantMismatch || forceFlag);

  const report = `# Reporte de Eliminación: Demo Tenant y Usuario

**Fecha:** ${new Date().toISOString()}  
**Modo:** ${applied ? "APPLY (Borrado ejecutado)" : "DRY-RUN (Solo lectura)"}  
**Force:** ${forceFlag ? "Sí" : "No"}

---

## 📋 Datos Objetivo

### Usuario
- **ID:** \`${USER_ID}\`
- **Email:** \`${user.email}\`
- **Role:** \`${user.role}\`
- **Tenant ID:** \`${user.tenantId || "null"}\`
- **Created At:** \`${user.createdAt.toISOString()}\`
- **Es Demo:** ${isDemoUser ? "✅ Sí" : "❌ No (email no termina en @hausdame.test)"}

### Tenant
- **ID:** \`${TENANT_ID}\`
- **Name:** \`${tenant.name}\`
- **Slug:** \`${tenant.slug}\`
- **Created At:** \`${tenant.createdAt.toISOString()}\`
- **Es Demo:** ${isDemoTenant ? "✅ Sí" : "❌ No (slug/name no coincide con demo)"}

### Coherencia
- **user.tenantId === TENANT_ID:** ${user.tenantId === TENANT_ID ? "✅ Sí" : "❌ No"}
${userTenantMismatch ? `- ⚠️ **WARNING:** El usuario pertenece a otro tenant (${user.tenantId}). Esto puede indicar datos inconsistentes.` : ""}

---

## 📊 Referencias Encontradas

### Referencias CRÍTICAS (Bloquean borrado)

${criticalRefs.length === 0
  ? "✅ **Ninguna referencia crítica encontrada.**"
  : criticalRefs.map(ref => `- **${ref.model}**: ${ref.count} (${ref.notes})`).join("\n")}

### Referencias NO CRÍTICAS

${nonCriticalRefs.length === 0
  ? "✅ **Ninguna referencia no crítica encontrada.**"
  : nonCriticalRefs.map(ref => `- **${ref.model}**: ${ref.count} (${ref.notes})`).join("\n")}

---

## 📋 Tabla Completa de Referencias

| Model | Filter | Count | Notes | Critical |
|-------|--------|-------|-------|----------|
${referenceCounts.map(ref => `| ${ref.model} | ${ref.filter.substring(0, 50)} | ${ref.count === -1 ? "N/A" : ref.count} | ${ref.notes} | ${ref.isCritical ? "⚠️ Sí" : "No"} |`).join("\n")}

---

## ✅ Decisión Final

**Estado:** ${safeToDelete ? "✅ **SAFE TO DELETE**" : "❌ **NOT SAFE TO DELETE**"}

${criticalRefs.length > 0
  ? `### ❌ ABORT: Referencias Críticas Encontradas\n\nEl borrado fue abortado porque se encontraron referencias críticas que indican uso real:\n\n${criticalRefs.map(ref => `- ${ref.model}: ${ref.count}`).join("\n")}\n\n**Incluso con --force, estas referencias NO pueden ser borradas.**`
  : nonCriticalRefs.length > 0 && !force
    ? `### ⚠️ Referencias No Críticas Encontradas\n\nSe encontraron referencias no críticas. Para proceder con el borrado, ejecuta con --force:\n\n\`\`\`bash\nALLOW_SEED_WRITES=1 npx tsx scripts/debug/delete-demo-tenant-and-user.ts --apply --force\n\`\`\``
    : applied
      ? `### ✅ Borrado Ejecutado\n\nEl borrado se ejecutó exitosamente en modo APPLY.`
      : `### ✅ Listo para Borrar\n\nNo se encontraron referencias que bloqueen el borrado. Para ejecutar:\n\n\`\`\`bash\nALLOW_SEED_WRITES=1 npx tsx scripts/debug/delete-demo-tenant-and-user.ts --apply\n\`\`\``}

---

## ⚠️ Advertencias

${!isDemoTenant ? `- ⚠️ **CRITICAL WARNING:** El tenant NO parece ser demo (slug: "${tenant.slug}", name: "${tenant.name}")` : ""}
${!isDemoUser ? `- ⚠️ **CRITICAL WARNING:** El usuario NO parece ser demo (email: "${user.email}")` : ""}
${user.tenantId !== TENANT_ID ? `- ⚠️ **WARNING:** El usuario pertenece a otro tenant (${user.tenantId})` : ""}

---

**Generado por:** \`scripts/debug/delete-demo-tenant-and-user.ts\`  
**Database:** ${dbFp.host} / ${dbFp.dbName}
`;

  fs.writeFileSync(reportPath, report, "utf-8");
  console.log();
  console.log(`📄 Reporte generado: ${reportPath}`);
}


main()
  .catch((e) => {
    console.error("❌ Fatal error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

