// Script para desarchivar "Colchón" y corregir normalización si es necesario
import prisma from "../lib/prisma";
import { normalizeName, capitalizeFirst } from "../lib/inventory-normalize";

async function fixColchon() {
  console.log("=== FIX: Desarchivar 'Colchón' ===\n");

  // Buscar todos los items relacionados con "colchón"
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  for (const tenant of tenants) {
    console.log(`\nTenant: ${tenant.name} (${tenant.id})`);
    
    // Buscar items con nameNormalized que contenga "colch"
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId: tenant.id,
        nameNormalized: {
          contains: "colch",
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        nameNormalized: true,
        archivedAt: true,
        category: true,
      },
    });

    if (items.length === 0) {
      console.log("  No hay items relacionados con 'colchón'");
      continue;
    }

    console.log(`  Encontrados ${items.length} items:`);
    items.forEach((item) => {
      console.log(`    - ${item.name} (${item.nameNormalized}) [${item.category}] ${item.archivedAt ? '[ARCHIVED]' : '[ACTIVE]'}`);
    });

    // Buscar el item "Colchón" correcto (nameNormalized = "colchon")
    const colchonItem = items.find(
      (item) => normalizeName(item.name) === "colchon"
    );

    if (colchonItem) {
      console.log(`\n  ✅ Encontrado: "${colchonItem.name}" (${colchonItem.nameNormalized})`);
      
      if (colchonItem.archivedAt) {
        console.log(`  🔧 Desarchivando...`);
        
        // Verificar si hay otro "Colchón" activo
        const activeColchon = await prisma.inventoryItem.findFirst({
          where: {
            tenantId: tenant.id,
            nameNormalized: "colchon",
            archivedAt: null,
          },
        });

        if (activeColchon) {
          console.log(`  ⚠️  Ya existe un "Colchón" activo (${activeColchon.id})`);
          console.log(`  💡 Considera eliminar o archivar el duplicado antes de continuar`);
        } else {
          // Desarchivar y corregir nombre si es necesario
          const correctedName = capitalizeFirst(colchonItem.name.trim());
          const correctedNameNormalized = normalizeName(correctedName);

          await prisma.inventoryItem.update({
            where: { id: colchonItem.id },
            data: {
              archivedAt: null,
              name: correctedName, // Asegurar capitalización correcta
              nameNormalized: correctedNameNormalized, // Asegurar normalización correcta
              category: "FURNITURE_EQUIPMENT", // Corregir categoría si es necesario
            },
          });

          console.log(`  ✅ Desarchivado y corregido: "${correctedName}"`);
        }
      } else {
        console.log(`  ✅ Ya está activo`);
      }
    } else {
      console.log(`  ❌ No se encontró "Colchón" con nameNormalized = "colchon"`);
      console.log(`  💡 Puede que necesites crear un nuevo item "Colchón"`);
    }
  }

  console.log("\n=== FIN DEL FIX ===");
}

fixColchon()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

