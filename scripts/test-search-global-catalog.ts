// Script de prueba para verificar searchGlobalCatalogItems
import { searchGlobalCatalogItems } from "../lib/inventory";

async function test() {
  console.log("=== PRUEBA: searchGlobalCatalogItems ===\n");

  const testCases = ["COLCH", "colch", "Colch", "COLCHÓN", "colchon"];

  for (const searchTerm of testCases) {
    console.log(`🔍 Búsqueda: "${searchTerm}"`);
    const results = await searchGlobalCatalogItems(searchTerm, "es-MX", 20);
    
    if (results.length > 0) {
      console.log(`   ✅ Encontrados ${results.length} resultado(s):`);
      results.forEach((item) => {
        console.log(`      - ${item.name} (${item.nameNormalized})`);
      });
    } else {
      console.log("   ❌ No se encontraron resultados");
    }
    console.log();
  }

  console.log("=== FIN DE PRUEBA ===");
}

test()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
