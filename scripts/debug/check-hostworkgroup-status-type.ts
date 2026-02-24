import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const rows = await prisma.$queryRaw<
    Array<{ typname: string }>
  >`
    SELECT t.typname::text AS typname
    FROM pg_type t
    WHERE t.typname IN ('HostWorkGroupStatus', 'hostworkgroupstatus')
    ORDER BY t.typname;
  `;

  console.log("\n▶ pg_type matches for HostWorkGroupStatus:");
  console.table(rows);

  const hasType = rows.length > 0;
  console.log("\n▶ Has enum type?:", hasType ? "✅ YES" : "❌ NO");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
