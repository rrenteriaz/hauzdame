import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const rows = await prisma.$queryRaw<
    Array<{ indexname: string; indexdef: string }>
  >`
    SELECT
      indexname::text AS indexname,
      indexdef::text  AS indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'HostWorkGroup'
    ORDER BY indexname;
  `;

  console.log('\n▶ Indexes for public."HostWorkGroup":\n');
  console.table(rows);

  const hasOld = rows.some((r: { indexname: string; indexdef: string }) => r.indexname === "HostWorkGroup_tenantId_name_key");
  const hasPartial = rows.some((r: { indexname: string; indexdef: string }) => r.indexname === "HostWorkGroup_tenantId_name_active_key");

  console.log("\n▶ Has old unique index (should be NO):", hasOld ? "❌ YES" : "✅ NO");
  console.log("▶ Has partial unique ACTIVE index (should be YES):", hasPartial ? "✅ YES" : "❌ NO");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
