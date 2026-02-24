// Script de diagnóstico para verificar "Colchón" en GlobalCatalogItem
// NO destructivo - solo consulta y reporta
import prisma from "../lib/prisma";
import { normalizeName } from "../lib/inventory-normalize";

const LOCALE = "es-MX"; // Locale usado por searchGlobalCatalogItemsAction

async function diagnose() {
  console.log("=== DIAGNÓSTICO: GlobalCatalogItem - 'Colchón' ===\n");

  // 1. Verificar locale usado
  console.log(`📍 Locale esperado: "${LOCALE}"\n`);

  // 2. Normalizar "Colchón" para búsqueda
  const colchonNormalized = normalizeName("Colchón");
  console.log(`🔍 Búsqueda normalizada: "${colchonNormalized}"\n`);

  // 3. Buscar por nameNormalized exacto
  console.log("📋 Búsqueda 1: nameNormalized = 'colchon'");
  const exactMatch = await (prisma as any).globalCatalogItem.findMany({
    where: {
      nameNormalized: "colchon",
    },
    select: {
      id: true,
      locale: true,
      name: true,
      nameNormalized: true,
      defaultCategory: true,
      isActive: true,
    },
  });

  if (exactMatch.length > 0) {
    console.log(`   ✅ Encontrados ${exactMatch.length} item(s):`);
    exactMatch.forEach((item: any) => {
      console.log(`      - ID: ${item.id}`);
      console.log(`        Locale: ${item.locale}`);
      console.log(`        Name: ${item.name}`);
      console.log(`        nameNormalized: ${item.nameNormalized}`);
      console.log(`        defaultCategory: ${item.defaultCategory}`);
      console.log(`        isActive: ${item.isActive}`);
    });
  } else {
    console.log("   ❌ No encontrado");
  }
  console.log();

  // 4. Buscar por nameNormalized con contains (como hace searchGlobalCatalogItems)
  console.log("📋 Búsqueda 2: nameNormalized contiene 'colch' (prefijo de 4 chars)");
  const prefixMatch = await (prisma as any).globalCatalogItem.findMany({
    where: {
      locale: LOCALE,
      isActive: true,
      nameNormalized: {
        contains: "colch",
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      locale: true,
      name: true,
      nameNormalized: true,
      defaultCategory: true,
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  if (prefixMatch.length > 0) {
    console.log(`   ✅ Encontrados ${prefixMatch.length} item(s):`);
    prefixMatch.forEach((item: any) => {
      console.log(`      - ${item.name} (${item.nameNormalized}) [locale: ${item.locale}, active: ${item.isActive}]`);
    });
  } else {
    console.log("   ❌ No encontrado");
  }
  console.log();

  // 5. Buscar por name ILIKE (búsqueda amplia)
  console.log("📋 Búsqueda 3: name ILIKE '%colch%' (búsqueda amplia)");
  const nameMatch = await prisma.$queryRaw`
    SELECT id, locale, name, "nameNormalized", "defaultCategory", "isActive"
    FROM "GlobalCatalogItem"
    WHERE name ILIKE '%colch%'
    ORDER BY name ASC
  `;

  if (Array.isArray(nameMatch) && nameMatch.length > 0) {
    console.log(`   ✅ Encontrados ${nameMatch.length} item(s):`);
    (nameMatch as any[]).forEach((item: any) => {
      console.log(`      - ${item.name} (${item.nameNormalized}) [locale: ${item.locale}, active: ${item.isActive}]`);
    });
  } else {
    console.log("   ❌ No encontrado");
  }
  console.log();

  // 6. Conteo total por locale
  console.log("📊 Conteo total de GlobalCatalogItem por locale:");
  const countsByLocale = await prisma.$queryRaw`
    SELECT locale, COUNT(*) as count, COUNT(*) FILTER (WHERE "isActive" = true) as active_count
    FROM "GlobalCatalogItem"
    GROUP BY locale
    ORDER BY locale ASC
  `;

  if (Array.isArray(countsByLocale) && countsByLocale.length > 0) {
    (countsByLocale as any[]).forEach((row: any) => {
      console.log(`   - ${row.locale}: ${row.count} total (${row.active_count} activos)`);
    });
  } else {
    console.log("   ⚠️  No hay items en la tabla");
  }
  console.log();

  // 7. Verificar normalización
  console.log("🔧 Verificación de normalización:");
  const testNames = ["Colchón", "COLCHÓN", "colchon", "Colcha", "COLCHA"];
  testNames.forEach((name) => {
    const normalized = normalizeName(name);
    console.log(`   "${name}" → "${normalized}"`);
  });
  console.log();

  // 8. Simular búsqueda como searchGlobalCatalogItems
  console.log("🔍 Simulación de searchGlobalCatalogItems('COLCH'):");
  const searchTerm = "COLCH";
  const normalizedSearch = normalizeName(searchTerm.trim());
  console.log(`   Search term: "${searchTerm}"`);
  console.log(`   Normalized: "${normalizedSearch}"`);

  const dbPrefix = normalizedSearch.length >= 3 ? normalizedSearch.slice(0, 4) : normalizedSearch;
  console.log(`   DB prefix: "${dbPrefix}"`);

  const candidates = await (prisma as any).globalCatalogItem.findMany({
    where: {
      locale: LOCALE,
      isActive: true,
      nameNormalized: {
        contains: dbPrefix,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      nameNormalized: true,
      defaultCategory: true,
    },
    orderBy: {
      name: "asc",
    },
    take: 200,
  });

  // Filtrar en Node (como hace searchGlobalCatalogItems)
  const filtered = candidates.filter((item: any) => {
    return item.nameNormalized.includes(normalizedSearch);
  });

  const sorted = filtered.sort((a: any, b: any) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );

  const limited = sorted.slice(0, 20);

  if (limited.length > 0) {
    console.log(`   ✅ Resultados (${limited.length}):`);
    limited.forEach((item: any) => {
      console.log(`      - ${item.name} (${item.nameNormalized})`);
    });
  } else {
    console.log("   ❌ No se encontraron resultados");
  }
  console.log();

  console.log("=== FIN DEL DIAGNÓSTICO ===");
}

diagnose()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
