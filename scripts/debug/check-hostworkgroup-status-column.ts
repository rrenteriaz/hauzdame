import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
    const rows = await prisma.$queryRaw<
    Array<{ column_name: string; data_type: string; is_nullable: string }>
  >`
    SELECT
      column_name::text AS column_name,
      data_type::text   AS data_type,
      is_nullable::text AS is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'HostWorkGroup'
    ORDER BY ordinal_position;
  `;


  console.log("\n▶ Columns in public.\"HostWorkGroup\":\n");
  if (!rows.length) {
    console.log("❌ No rows returned. Table may not exist (or different schema/name).");
    return;
  }

  // Pretty print (no dependencies)
  const hasStatus = rows.some((r: { column_name: string; data_type: string; is_nullable: string }) => r.column_name === "status");
  console.table(rows);

  console.log("\n▶ Has column 'status'?:", hasStatus ? "✅ YES" : "❌ NO");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
