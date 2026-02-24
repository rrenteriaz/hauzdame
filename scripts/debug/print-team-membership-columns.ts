import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const tmCols = await prisma.$queryRawUnsafe<
    Array<{ column_name: string; data_type: string; is_nullable: string; column_default: string | null }>
  >(`
    SELECT
      column_name::text AS column_name,
      data_type::text AS data_type,
      is_nullable::text AS is_nullable,
      column_default::text AS column_default
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='TeamMembership'
    ORDER BY ordinal_position;
  `);

  const memberCols = await prisma.$queryRawUnsafe<
    Array<{ column_name: string; data_type: string; is_nullable: string; column_default: string | null }>
  >(`
    SELECT
      column_name::text AS column_name,
      data_type::text AS data_type,
      is_nullable::text AS is_nullable,
      column_default::text AS column_default
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='TeamMember'
    ORDER BY ordinal_position;
  `);

  console.log("\n=== Columns: TeamMembership ===");
  console.table(tmCols);

  console.log("\n=== Columns: TeamMember ===");
  console.table(memberCols);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
