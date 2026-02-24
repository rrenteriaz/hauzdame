import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      migration_name: string;
      started_at: string | null;
      finished_at: string | null;
      applied_steps_count: number;
      rolled_back_at: string | null;
    }>
  >(`
    SELECT
      migration_name,
      started_at::text    AS started_at,
      finished_at::text   AS finished_at,
      applied_steps_count,
      rolled_back_at::text AS rolled_back_at
    FROM "_prisma_migrations"
    WHERE applied_steps_count = 0
       OR finished_at IS NULL
       OR rolled_back_at IS NOT NULL
    ORDER BY started_at ASC;
  `);

  if (!rows.length) {
    console.log("✅ No hay migraciones sospechosas (0 steps / unfinished / rolled back).");
    return;
  }

  console.log("⚠️ Migraciones sospechosas:");
  console.table(rows);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
