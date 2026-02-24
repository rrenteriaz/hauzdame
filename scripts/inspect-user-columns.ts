import prisma from "../lib/prisma";

async function main() {
  const rows = await prisma.$queryRawUnsafe<{ column_name: string; data_type: string; is_nullable: string }[]>(`
    SELECT
      column_name::text as column_name,
      data_type::text as data_type,
      is_nullable::text as is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
    ORDER BY ordinal_position;
  `);

  console.log('User columns (DB real):');
  for (const r of rows) {
    console.log(`- ${r.column_name} (${r.data_type}) nullable=${r.is_nullable}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
