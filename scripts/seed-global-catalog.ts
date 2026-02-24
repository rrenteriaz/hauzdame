// Script para sembrar el Catálogo Global (GlobalCatalogItem) desde JSON
// DRY RUN por defecto, requiere --apply para ejecutar cambios
import prisma from "../lib/prisma";
import { normalizeName } from "../lib/inventory-normalize";
import * as fs from "fs";
import * as path from "path";

const LOCALE = "es-MX";

interface CatalogItem {
  name: string;
  category: string;
}

interface CatalogData {
  metadata: {
    version: string;
    locale: string;
    description: string;
    createdAt: string;
    totalItems: number;
  };
  items: CatalogItem[];
}

async function seedGlobalCatalog(apply: boolean = false) {
  console.log("=== SEED: Catálogo Global (GlobalCatalogItem) ===\n");
  console.log(`Modo: ${apply ? "APPLY (modificará DB)" : "DRY RUN (solo reporte)"}\n`);

  // Cargar JSON
  const jsonPath = path.join(process.cwd(), "data", "globalCatalog.es-mx.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ No se encontró el archivo: ${jsonPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(jsonPath, "utf-8");
  const catalogData: CatalogData = JSON.parse(fileContent);

  console.log(`📦 Cargados ${catalogData.items.length} items del JSON\n`);

  // Validar y normalizar items
  const itemsToUpsert: Array<{
    locale: string;
    name: string;
    nameNormalized: string;
    defaultCategory: string | null;
    isActive: boolean;
  }> = [];

  const duplicates: string[] = [];
  const seen = new Set<string>();

  for (const item of catalogData.items) {
    const nameNormalized = normalizeName(item.name);
    const key = `${LOCALE}::${nameNormalized}`;

    if (seen.has(key)) {
      duplicates.push(`${item.name} (${nameNormalized})`);
      continue;
    }
    seen.add(key);

    itemsToUpsert.push({
      locale: LOCALE,
      name: item.name.trim(),
      nameNormalized,
      defaultCategory: item.category || null,
      isActive: true,
    });
  }

  if (duplicates.length > 0) {
    console.log(`⚠️  Duplicados detectados en JSON (se omitirán):`);
    duplicates.forEach((dup) => console.log(`   - ${dup}`));
    console.log();
  }

  console.log(`✅ Items únicos a procesar: ${itemsToUpsert.length}\n`);

  if (!apply) {
    console.log("🔍 DRY RUN: Verificando items existentes en DB...\n");

    // Contar existentes vs nuevos
    let existingCount = 0;
    let newCount = 0;

    for (const item of itemsToUpsert) {
      const existing = await prisma.globalCatalogItem.findUnique({
        where: {
          locale_nameNormalized: {
            locale: item.locale,
            nameNormalized: item.nameNormalized,
          },
        },
      });

      if (existing) {
        existingCount++;
      } else {
        newCount++;
      }
    }

    console.log(`📊 Estadísticas:`);
    console.log(`   - Existentes: ${existingCount}`);
    console.log(`   - Nuevos: ${newCount}`);
    console.log(`   - Total: ${itemsToUpsert.length}\n`);

    console.log("💡 Para aplicar cambios, ejecuta con --apply:");
    console.log("   npx tsx -r dotenv/config scripts/seed-global-catalog.ts --apply\n");

    return;
  }

  // APPLY: Upsert items
  console.log("🔧 APPLY: Insertando/actualizando items en DB...\n");

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of itemsToUpsert) {
    try {
      const result = await prisma.globalCatalogItem.upsert({
        where: {
          locale_nameNormalized: {
            locale: item.locale,
            nameNormalized: item.nameNormalized,
          },
        },
        update: {
          name: item.name, // Actualizar nombre si cambió
          defaultCategory: item.defaultCategory,
          isActive: item.isActive,
        },
        create: item,
      });

      // Determinar si fue creación o actualización
      const wasCreated = result.createdAt.getTime() === result.updatedAt.getTime();
      if (wasCreated) {
        created++;
      } else {
        updated++;
      }
    } catch (error: any) {
      console.error(`❌ Error procesando "${item.name}": ${error.message}`);
      skipped++;
    }
  }

  console.log(`\n✅ Seed completado:`);
  console.log(`   - Creados: ${created}`);
  console.log(`   - Actualizados: ${updated}`);
  console.log(`   - Omitidos: ${skipped}`);
  console.log(`   - Total procesados: ${created + updated + skipped}\n`);
}

// Parsear argumentos
const args = process.argv.slice(2);
const apply = args.includes("--apply");

if (args.includes("--dry-run") && apply) {
  console.error("❌ No puedes usar --dry-run y --apply simultáneamente");
  process.exit(1);
}

seedGlobalCatalog(apply)
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

