// scripts/dedupe-catalog-items.ts
// Deduplica InventoryItem por (tenantId, nameNormalized) antes de aplicar migración de unicidad
// Ejecutar:
//   npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts              (solo reporta, no cambia nada)
//   npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts --apply      (aplica cambios)
//
// NOTA: Este script debe ejecutarse ANTES de aplicar la migración:
//   prisma/migrations/20250125000000_fix_catalog_item_uniqueness_constraint/migration.sql
//
// ESTRATEGIA: Losers archivados tienen nameNormalized mutado a `${original}__a__${id.slice(0,8)}`
// para garantizar que no violen el constraint UNIQUE(tenantId, nameNormalized).
// Los strings se truncan para evitar exceder límites de DB.
//
// En producción: hacer backup antes de ejecutar con --apply

import prisma from "../lib/prisma";

// Flags: solo --apply modifica DB. Sin flags = DRY RUN (solo reporta)
const APPLY = process.argv.includes("--apply");

// Validar flags conflictivos
if (APPLY && process.argv.includes("--dry-run")) {
  console.error("Error: Cannot use --apply and --dry-run together.");
  console.error("Use --apply to modify DB, or omit flags for dry-run.");
  process.exit(1);
}

// Límites de longitud para campos (safe defaults)
const NAME_NORM_MAX = 191; // Safe default para nameNormalized
const NAME_MAX = 255; // Safe default para name
const SUFFIX_SHORT = "__a__"; // Sufijo corto para nameNormalized

type DuplicateGroup = {
  tenantId: string;
  nameNormalized: string;
  items: Array<{
    id: string;
    name: string;
    category: string;
    createdAt: Date;
    archivedAt: Date | null;
    nameNormalized: string; // Necesario para verificación de idempotencia
  }>;
  winner: {
    id: string;
    name: string;
    category: string;
    archivedAt: Date | null; // Para detectar grupos "ALL ARCHIVED"
  };
  losers: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  allArchived: boolean; // Flag para grupos donde todos están archivados
};

type ReassignmentStats = {
  inventoryItemAssets: number;
  inventoryLines: number;
  inventoryChecks: number;
  inventoryReviewItemChanges: number;
  inventoryReports: number;
};

// Helper para truncar strings respetando límites
function truncate(s: string, max: number): string {
  if (max <= 0) return "";
  return s.slice(0, max);
}

// Helper para construir nameNormalized mutado con límites
function buildMutatedNameNormalized(original: string, loserId: string): string {
  const suffix = `${SUFFIX_SHORT}${loserId.slice(0, 8)}`;
  const maxOriginalLength = NAME_NORM_MAX - suffix.length;
  const truncated = truncate(original, maxOriginalLength);
  return truncated + suffix;
}

// Helper para construir name mutado con límites
function buildMutatedName(original: string, loserId: string): string {
  const suffix = ` (archived ${loserId.slice(0, 8)})`;
  const maxOriginalLength = NAME_MAX - suffix.length;
  const truncated = truncate(original, maxOriginalLength);
  return truncated + suffix;
}

async function main() {
  console.log("\n=== DEDUPE CATALOG ITEMS (InventoryItem) ===");
  
  // Default: solo reporta (seguro)
  const mode = APPLY ? "APPLY (will modify DB)" : "DRY RUN (no changes)";
  console.log(`Mode: ${mode}\n`);
  
  if (!APPLY) {
    console.log("ℹ️  Running in DRY RUN mode. No changes will be made.");
    console.log("   To apply changes, run with --apply flag.\n");
  }

  // 1. Detectar duplicados por (tenantId, nameNormalized)
  console.log("1. Detecting duplicates by (tenantId, nameNormalized)...");
  const duplicates = await prisma.inventoryItem.groupBy({
    by: ["tenantId", "nameNormalized"],
    having: {
      id: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  if (duplicates.length === 0) {
    console.log("✓ No duplicates found. Database is ready for migration.\n");
    return;
  }

  console.log(`Found ${duplicates.length} duplicate groups.\n`);

  // 2. Para cada grupo, obtener items y elegir winner determinístico
  const groups: DuplicateGroup[] = [];
  for (const dup of duplicates) {
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId: dup.tenantId,
        nameNormalized: dup.nameNormalized,
      },
      select: {
        id: true,
        name: true,
        category: true,
        createdAt: true,
        archivedAt: true,
        nameNormalized: true, // Necesario para verificación de idempotencia
      },
      orderBy: [
        { createdAt: "asc" }, // Más antiguo primero
        { id: "asc" }, // Si empate, id más bajo
      ],
    });

    if (items.length < 2) continue; // No debería pasar, pero por seguridad

    // Elegir winner: preferir NO archivado, pero si todos están archivados, usar el más antiguo
    const activeItems = items.filter((item) => item.archivedAt === null);
    const winner = activeItems.length > 0 ? activeItems[0] : items[0];
    const allArchived = activeItems.length === 0;
    const losers = items.filter((item) => item.id !== winner.id);

    groups.push({
      tenantId: dup.tenantId,
      nameNormalized: dup.nameNormalized,
      items,
      winner: {
        id: winner.id,
        name: winner.name,
        category: winner.category,
        archivedAt: winner.archivedAt,
      },
      losers: losers.map((l) => ({
        id: l.id,
        name: l.name,
        category: l.category,
      })),
      allArchived,
    });
  }

  // 3. Reporte de grupos detectados
  console.log("2. Duplicate groups summary:");
  console.log("=".repeat(80));
  for (const group of groups) {
    console.log(`\nGroup: tenantId=${group.tenantId}, nameNormalized="${group.nameNormalized}"`);
    const winnerStatus = group.winner.archivedAt ? "[ARCHIVED]" : "[ACTIVE]";
    console.log(`  Winner: ${group.winner.id} | "${group.winner.name}" | ${group.winner.category} ${winnerStatus}`);
    if (group.allArchived) {
      console.log(`  ⚠️  WARNING: ALL ARCHIVED GROUP - Winner is archived but will be used to resolve duplicates`);
    }
    console.log(`  Losers (${group.losers.length}):`);
    for (const loser of group.losers) {
      console.log(`    - ${loser.id} | "${loser.name}" | ${loser.category}`);
    }
  }
  console.log("\n" + "=".repeat(80));

  const totalLosers = groups.reduce((sum, g) => sum + g.losers.length, 0);
  const allArchivedGroups = groups.filter((g) => g.allArchived).length;
  console.log(`\nTotal: ${groups.length} groups, ${totalLosers} items to archive/reassign`);
  if (allArchivedGroups > 0) {
    console.log(`⚠️  ${allArchivedGroups} group(s) with all items archived\n`);
  } else {
    console.log();
  }

  // Calcular stats estimadas en DRY RUN
  const estimatedStats: ReassignmentStats = {
    inventoryItemAssets: 0,
    inventoryLines: 0,
    inventoryChecks: 0,
    inventoryReviewItemChanges: 0,
    inventoryReports: 0,
  };

  if (!APPLY) {
    // En DRY RUN, calcular conteos estimados sin hacer updates
    console.log("3. Calculating estimated reassignment counts (DRY RUN)...");
    for (const group of groups) {
      const loserIds = group.losers.map((l) => l.id);

      // Contar relaciones que serían reasignadas (sin actualizar)
      const [assetsCount, linesCount, changesCount, reportsCount] = await Promise.all([
        prisma.inventoryItemAsset.count({
          where: { itemId: { in: loserIds } },
        }),
        prisma.inventoryLine.count({
          where: { itemId: { in: loserIds } },
        }),
        prisma.inventoryReviewItemChange.count({
          where: { itemId: { in: loserIds } },
        }),
        prisma.inventoryReport.count({
          where: { itemId: { in: loserIds } },
        }),
      ]);

      estimatedStats.inventoryItemAssets += assetsCount;
      estimatedStats.inventoryLines += linesCount;
      estimatedStats.inventoryReviewItemChanges += changesCount;
      estimatedStats.inventoryReports += reportsCount;
    }

    console.log("\n4. Estimated reassignments (DRY RUN):");
    console.log("=".repeat(80));
    console.log(`Groups to process: ${groups.length}`);
    console.log(`Items to archive: ${totalLosers}`);
    console.log(`\nEstimated reassignments:`);
    console.log(`  InventoryItemAsset: ${estimatedStats.inventoryItemAssets}`);
    console.log(`  InventoryLine: ${estimatedStats.inventoryLines}`);
    console.log(`  InventoryCheck: ${estimatedStats.inventoryChecks} (via InventoryLine)`);
    console.log(`  InventoryReviewItemChange: ${estimatedStats.inventoryReviewItemChanges}`);
    console.log(`  InventoryReport: ${estimatedStats.inventoryReports}`);
    console.log("=".repeat(80));
    console.log("\nDRY RUN: No changes made. Run with --apply to apply changes.\n");
    return;
  }

  // Validaciones previas en modo APPLY (winner ya fue elegido correctamente arriba)
  console.log("3. Validating before applying changes...");
  for (const group of groups) {
    const winnerItem = group.items.find((item) => item.id === group.winner.id);
    if (!winnerItem) {
      throw new Error(`Winner item ${group.winner.id} not found in group ${group.nameNormalized}`);
    }
    // No abortar si winner está archivado (ya se eligió el mejor disponible)
  }
  console.log("✓ Validation passed.\n");

  // 4. Aplicar cambios en transacción
  console.log("4. Applying deduplication...");
  const stats: ReassignmentStats = {
    inventoryItemAssets: 0,
    inventoryLines: 0,
    inventoryChecks: 0,
    inventoryReviewItemChanges: 0,
    inventoryReports: 0,
  };

  await prisma.$transaction(async (tx) => {
    for (const group of groups) {
      const loserIds = group.losers.map((l) => l.id);
      const winnerId = group.winner.id;
      const originalNameNormalized = group.nameNormalized;

      // Reasignar InventoryItemAsset
      const assetsUpdated = await tx.inventoryItemAsset.updateMany({
        where: {
          itemId: { in: loserIds },
        },
        data: {
          itemId: winnerId,
        },
      });
      stats.inventoryItemAssets += assetsUpdated.count;

      // Reasignar InventoryLine
      const linesUpdated = await tx.inventoryLine.updateMany({
        where: {
          itemId: { in: loserIds },
        },
        data: {
          itemId: winnerId,
        },
      });
      stats.inventoryLines += linesUpdated.count;

      // Reasignar InventoryCheck (usa inventoryLineId, no inventoryItemId directamente)
      // Nota: InventoryCheck referencia InventoryLine, no InventoryItem directamente
      // Las InventoryLine ya fueron reasignadas arriba, así que los checks quedan correctos
      // No hay campo inventoryItemId en InventoryCheck según el schema
      stats.inventoryChecks += 0; // No se reasignan directamente

      // Reasignar InventoryReviewItemChange
      const changesUpdated = await tx.inventoryReviewItemChange.updateMany({
        where: {
          itemId: { in: loserIds },
        },
        data: {
          itemId: winnerId,
        },
      });
      stats.inventoryReviewItemChanges += changesUpdated.count;

      // Reasignar InventoryReport
      const reportsUpdated = await tx.inventoryReport.updateMany({
        where: {
          itemId: { in: loserIds },
        },
        data: {
          itemId: winnerId,
        },
      });
      stats.inventoryReports += reportsUpdated.count;

      // Archivar losers y mutar nameNormalized para evitar violación de UNIQUE
      // ESTRATEGIA A: nameNormalized mutado con sufijo corto y truncado si es necesario
      // Esto garantiza que después del dedupe, la migración UNIQUE(tenantId, nameNormalized) siempre aplica
      for (const loserId of loserIds) {
        const loserItem = group.items.find((item) => item.id === loserId);
        if (!loserItem) continue;

        // Idempotencia: si ya está archivado y mutado, skip (o verificar que relaciones ya están en winner)
        const expectedSuffix = `${SUFFIX_SHORT}${loserId.slice(0, 8)}`;
        // TypeScript: loserItem tiene nameNormalized porque está en el select y en el tipo DuplicateGroup
        const loserNameNormalized = (loserItem as typeof loserItem & { nameNormalized: string }).nameNormalized;
        if (
          loserItem.archivedAt !== null &&
          loserNameNormalized.includes(expectedSuffix)
        ) {
          // Ya procesado en corrida previa, skip update pero asegurar relaciones
          // (las relaciones ya deberían estar en winner, pero no abortamos)
          continue;
        }

        // Construir strings mutados con límites de longitud
        const mutatedNameNormalized = buildMutatedNameNormalized(originalNameNormalized, loserId);
        const mutatedName = buildMutatedName(loserItem.name, loserId);

        await tx.inventoryItem.update({
          where: { id: loserId },
          data: {
            archivedAt: new Date(),
            nameNormalized: mutatedNameNormalized, // Mutar para evitar violación de UNIQUE
            name: mutatedName, // Hacer visible que está archivado
          },
        });
      }
    }
  });

  // 5. Reporte final
  console.log("\n5. Deduplication complete!");
  console.log("=".repeat(80));
  console.log(`Groups processed: ${groups.length}`);
  console.log(`Items archived: ${totalLosers}`);
  console.log(`\nReassignments:`);
  console.log(`  InventoryItemAsset: ${stats.inventoryItemAssets}`);
  console.log(`  InventoryLine: ${stats.inventoryLines}`);
  console.log(`  InventoryCheck: ${stats.inventoryChecks}`);
  console.log(`  InventoryReviewItemChange: ${stats.inventoryReviewItemChanges}`);
  console.log(`  InventoryReport: ${stats.inventoryReports}`);
  console.log("=".repeat(80));
  console.log("\n✓ Database is now ready for migration.");
  console.log("  Losers have been archived with mutated nameNormalized to avoid UNIQUE constraint violations.\n");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

