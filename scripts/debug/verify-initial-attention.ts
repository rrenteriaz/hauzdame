import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const summary = await prisma.$queryRawUnsafe<
    Array<{ total: number; needs_attention: number }>
  >(`
    SELECT
      count(*)::int AS total,
      sum(CASE WHEN "needsAttention" THEN 1 ELSE 0 END)::int AS needs_attention
    FROM "Cleaning";
  `);

  const byReason = await prisma.$queryRawUnsafe<
    Array<{ attentionreason: string | null; count: number }>
  >(`
    SELECT
      "attentionReason"::text AS attentionreason,
      count(*)::int AS count
    FROM "Cleaning"
    GROUP BY "attentionReason"
    ORDER BY count(*) DESC;
  `);

  console.log("\n=== Initial attention (verify) ===");
  console.table(summary);
  console.table(byReason);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
