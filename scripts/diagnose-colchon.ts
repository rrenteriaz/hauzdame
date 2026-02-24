// Script temporal de diagnóstico: ¿Por qué "Colchón" no aparece en autocomplete?
import prisma from "../lib/prisma";
import { normalizeName } from "../lib/inventory-normalize";

async function diagnose() {
  console.log("=== DIAGNÓSTICO: ¿Por qué 'Colchón' no aparece en autocomplete? ===\n");

  // 1. Verificar fuente de datos del autocomplete
  console.log("1) FUENTE DE DATOS DEL AUTOCOMPLETE:");
  console.log("   - Función: searchInventoryCatalog() en lib/inventory.ts");
  console.log("   - Tabla consultada: InventoryItem (por tenant)");
  console.log("   - NO consulta: GlobalCatalogItem (no existe en schema)\n");

  // 2. Verificar si "Colchón" existe en InventoryItem (tenant)
  console.log("2) VERIFICAR SI 'Colchón' EXISTE EN InventoryItem (tenant):");
  
  const normalizedSearch = normalizeName("colchón");
  console.log(`   - Término normalizado: "${normalizedSearch}"`);
  
  // Buscar todos los tenants para verificar en cada uno
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
    take: 5,
  });

  for (const tenant of tenants) {
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId: tenant.id,
        nameNormalized: {
          contains: normalizedSearch.slice(0, 4), // "colc"
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

    console.log(`\n   Tenant: ${tenant.name} (${tenant.id})`);
    if (items.length === 0) {
      console.log(`   ❌ NO existe "Colchón" en este tenant`);
    } else {
      console.log(`   ✅ Encontrados ${items.length} items:`);
      items.forEach((item) => {
        console.log(`      - ${item.name} (${item.nameNormalized}) [${item.category}] ${item.archivedAt ? '[ARCHIVED]' : '[ACTIVE]'}`);
      });
    }
  }

  // 3. Verificar búsqueda con "colch" (4 caracteres)
  console.log("\n3) VERIFICAR BÚSQUEDA CON 'colch' (4 caracteres):");
  const searchTerm = "colch";
  const normalized = normalizeName(searchTerm);
  console.log(`   - Término de búsqueda: "${searchTerm}"`);
  console.log(`   - Normalizado: "${normalized}"`);
  console.log(`   - Prefijo usado en query: "${normalized.slice(0, 4)}"`);

  for (const tenant of tenants) {
    const candidates = await prisma.inventoryItem.findMany({
      where: {
        tenantId: tenant.id,
        archivedAt: null, // Solo activos
        nameNormalized: {
          contains: normalized.slice(0, 4),
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        nameNormalized: true,
      },
      take: 10,
    });

    console.log(`\n   Tenant: ${tenant.name}`);
    if (candidates.length === 0) {
      console.log(`   ❌ No hay resultados para "colch"`);
    } else {
      console.log(`   ✅ Encontrados ${candidates.length} candidatos:`);
      candidates.forEach((item) => {
        const matches = normalizeName(item.name).includes(normalized);
        console.log(`      - ${item.name} (${item.nameNormalized}) ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
      });
    }
  }

  // 4. Verificar si existe GlobalCatalogItem (no debería existir)
  console.log("\n4) VERIFICAR SI EXISTE GlobalCatalogItem:");
  try {
    const globalItems = await (prisma as any).globalCatalogItem.findMany({
      where: {
        nameNormalized: {
          contains: normalizedSearch.slice(0, 4),
        },
      },
    });
    if (globalItems.length > 0) {
      console.log(`   ⚠️  Existe GlobalCatalogItem con ${globalItems.length} items`);
    } else {
      console.log(`   ✅ No existe tabla GlobalCatalogItem (esperado)`);
    }
  } catch (error: any) {
    if (error.message?.includes("does not exist") || error.message?.includes("Unknown model")) {
      console.log(`   ✅ No existe tabla GlobalCatalogItem (esperado)`);
    } else {
      console.log(`   ⚠️  Error al verificar: ${error.message}`);
    }
  }

  console.log("\n=== FIN DEL DIAGNÓSTICO ===");
}

diagnose()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

