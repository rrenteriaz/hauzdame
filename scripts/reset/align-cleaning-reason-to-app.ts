import "dotenv/config";
import prisma from "@/lib/prisma";

const hostTenantId = "cmkptilbc0000x4o7lvmlls57";

async function main() {
  console.log("▶️ Align Cleaning attentionReason to app codes");
  console.log({ hostTenantId });

  const updated = await prisma.$executeRawUnsafe(`
    UPDATE "Cleaning"
    SET
      "attentionReason" = 'NO_TEAM_CONFIGURED',
      "needsAttention" = true,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "tenantId"='${hostTenantId}'
      AND "attentionReason"='NO_PROPERTY_TEAMS';
  `);

  console.log("Rows updated:", updated);

  const byReason = await prisma.$queryRawUnsafe<Array<{ reason: string | null; count: number }>>(`
    SELECT "attentionReason"::text AS reason, count(*)::int AS count
    FROM "Cleaning"
    WHERE "tenantId"='${hostTenantId}'
    GROUP BY "attentionReason"
    ORDER BY count(*) DESC;
  `);

  console.log("\n=== Cleaning attentionReason (tenant) ===");
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
