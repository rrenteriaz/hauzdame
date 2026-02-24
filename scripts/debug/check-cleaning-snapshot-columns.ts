import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ column_name: string; data_type: string; is_nullable: string }>
  >(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Cleaning'
      AND column_name IN ('propertyName', 'propertyShortName', 'propertyAddress')
    ORDER BY column_name ASC;
  `);

  console.log("▶ Cleaning snapshot columns:");
  console.table(rows);
  console.log("▶ Missing any?:", rows.length === 3 ? "✅ NO" : "❌ YES");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
