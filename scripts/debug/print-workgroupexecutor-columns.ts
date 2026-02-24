import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const cols = await prisma.$queryRawUnsafe<
    Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>
  >(`
    SELECT
      column_name::text AS column_name,
      data_type::text AS data_type,
      is_nullable::text AS is_nullable,
      column_default::text AS column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WorkGroupExecutor'
    ORDER BY ordinal_position;
  `);

  console.log("\n=== Columns: WorkGroupExecutor ===");
  console.table(cols);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
