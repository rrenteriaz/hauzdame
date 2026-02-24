// scripts/backfill-cleaning-property-snapshot.ts
// Script para poblar snapshot de información de propiedad en Cleanings históricas

import "dotenv/config";
import prisma from "@/lib/prisma";
import { populatePropertySnapshotBatch } from "@/lib/cleanings/populatePropertySnapshot";

const BATCH_SIZE = 100;

function parseArgs() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const dryRun = !apply;

  return { apply, dryRun };
}

async function checkSnapshotColumnsExist(): Promise<boolean> {
  // Verificar que las columnas snapshot existen en la tabla Cleaning
  const requiredColumns = ["propertyName", "propertyShortName", "propertyAddress"];

  try {
    // Query con casts explícitos a TEXT para evitar error de deserialización del tipo Postgres 'name'
    const result = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT c.column_name::text AS column_name
       FROM information_schema.columns c
       WHERE c.table_schema::text = 'public'
         AND c.table_name::text = 'Cleaning'
         AND c.column_name::text IN ('propertyName','propertyShortName','propertyAddress')`
    );

    const existingColumns = new Set(result.map((row) => row.column_name));
    const missingColumns = requiredColumns.filter((col) => !existingColumns.has(col));

    if (missingColumns.length > 0) {
      console.error("❌ Snapshot columns missing in DB:", missingColumns.join(", "));
      console.error("   Required columns: propertyName, propertyShortName, propertyAddress");
      console.error("   Run migrations first (or restore correct backup). Aborting.");
      return false;
    }

    return true;
  } catch (error: any) {
    console.error("❌ Error checking snapshot columns:", error.message);
    console.error("   This might indicate the Cleaning table doesn't exist or schema issues.");
    return false;
  }
}

async function main() {
  const { apply, dryRun } = parseArgs();

  console.log("=".repeat(60));
  console.log("BACKFILL: Snapshot de información de propiedad en Cleaning");
  console.log("=".repeat(60));
  console.log(`Modo: ${dryRun ? "DRY RUN (no aplica cambios)" : "APPLY (aplica cambios)"}`);
  console.log();

  // Verificar que las columnas snapshot existen antes de continuar
  console.log("Verificando que las columnas snapshot existen en la DB...");
  const columnsExist = await checkSnapshotColumnsExist();
  if (!columnsExist) {
    process.exit(1);
  }
  console.log("✅ Columnas snapshot verificadas.");
  console.log();

  try {
    // Encontrar Cleanings sin snapshot (propertyName es null)
    // Nota: propertyId no es nullable en el schema, por lo que no necesitamos filtrar por él
    const cleaningsWithoutSnapshot = await prisma.cleaning.findMany({
      where: {
        propertyName: null,
      },
      select: {
        id: true,
        propertyId: true,
        tenantId: true,
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`Cleanings sin snapshot encontradas: ${cleaningsWithoutSnapshot.length}`);
    console.log();

    if (cleaningsWithoutSnapshot.length === 0) {
      console.log("✅ No hay Cleanings sin snapshot. Nada que hacer.");
      return;
    }

    if (dryRun) {
      console.log("DRY RUN: Se procesarían las siguientes Cleanings:");
      console.log();

      // Mostrar preview
      const preview = cleaningsWithoutSnapshot.slice(0, 10);
      for (const cleaning of preview) {
        console.log(`  - Cleaning ${cleaning.id} (propertyId: ${cleaning.propertyId}, tenantId: ${cleaning.tenantId})`);
      }
      if (cleaningsWithoutSnapshot.length > 10) {
        console.log(`  ... y ${cleaningsWithoutSnapshot.length - 10} más`);
      }
      console.log();
      console.log("Para aplicar cambios, ejecuta con --apply");
      return;
    }

    // Aplicar cambios en batches
    console.log(`Procesando ${cleaningsWithoutSnapshot.length} Cleanings en batches de ${BATCH_SIZE}...`);
    console.log();

    let totalUpdated = 0;
    let totalErrors = 0;

    for (let i = 0; i < cleaningsWithoutSnapshot.length; i += BATCH_SIZE) {
      const batch = cleaningsWithoutSnapshot.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map((c) => c.id);

      console.log(`Procesando batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(cleaningsWithoutSnapshot.length / BATCH_SIZE)} (${batch.length} Cleanings)...`);

      const result = await populatePropertySnapshotBatch(batchIds);

      totalUpdated += result.updated;
      totalErrors += result.errors;

      console.log(`  ✅ Actualizadas: ${result.updated}, ❌ Errores: ${result.errors}`);
      console.log();
    }

    console.log("=".repeat(60));
    console.log("RESUMEN FINAL");
    console.log("=".repeat(60));
    console.log(`Total procesadas: ${cleaningsWithoutSnapshot.length}`);
    console.log(`✅ Actualizadas: ${totalUpdated}`);
    console.log(`❌ Errores: ${totalErrors}`);
    console.log();

    if (totalErrors > 0) {
      console.log("⚠️  Algunas Cleanings no pudieron actualizarse. Posibles causas:");
      console.log("   - Property eliminada o no accesible");
      console.log("   - Property desasignada (cross-tenant)");
      console.log("   - Error de permisos o scoping");
    } else {
      console.log("✅ Todas las Cleanings fueron actualizadas exitosamente.");
    }
  } catch (error: any) {
    console.error("❌ Error en backfill:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

