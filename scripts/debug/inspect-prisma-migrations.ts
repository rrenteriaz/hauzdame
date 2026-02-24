import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const rows = await prisma.$queryRaw<
    Array<{
      migration_name: string;
      finished_at: string | null;
      applied_steps_count: number;
      rolled_back_at: string | null;
      started_at: string;
      logs: string | null;
      checksum: string;
    }>
  >`
    SELECT
      migration_name::text,
      finished_at::text,
      applied_steps_count,
      rolled_back_at::text,
      started_at::text,
      logs::text,
      checksum::text
    FROM "_prisma_migrations"
    ORDER BY started_at ASC;
  `;

  console.log("\n▶ _prisma_migrations (ordered):\n");
  console.table(
    rows.map((r: { migration_name: string; finished_at: string | null; applied_steps_count: number; rolled_back_at: string | null; started_at: string; logs: string | null; checksum: string }) => ({
      migration_name: r.migration_name,
      started_at: r.started_at,
      finished_at: r.finished_at,
      applied_steps_count: r.applied_steps_count,
      rolled_back_at: r.rolled_back_at,
      checksum_prefix: r.checksum?.slice(0, 12) ?? null,
    }))
  );

  const target = rows.find((r: { migration_name: string; finished_at: string | null; applied_steps_count: number; rolled_back_at: string | null; started_at: string; logs: string | null; checksum: string }) => r.migration_name === "20260122000408_fix_workgroup_inverse_relations");
  console.log("\n▶ Target migration row:");
  console.log(target ?? "❌ Not found in _prisma_migrations");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
