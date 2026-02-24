import "dotenv/config";
import prisma from "@/lib/prisma";

const hostTenantId = "cmkptilbc0000x4o7lvmlls57";
const workGroupId = "cmkpvrslw00005oo70cbazdmr";

async function main() {
  console.log("▶️ Transition Cleaning attention reason after WorkGroupExecutor exists");
  console.log({ hostTenantId, workGroupId });

  // Si existe al menos 1 executor para el WG, entonces ya no es NO_PROPERTY_TEAMS.
  const executors = await prisma.$queryRawUnsafe<Array<{ c: number }>>(`
    SELECT count(*)::int AS c
    FROM "WorkGroupExecutor"
    WHERE "hostTenantId"='${hostTenantId}'
      AND "workGroupId"='${workGroupId}'
      AND "status"='ACTIVE';
  `);

  const hasExecutor = (executors[0]?.c ?? 0) > 0;
  console.log("hasExecutor:", hasExecutor);

  if (!hasExecutor) {
    console.log("❌ No ACTIVE executor found; skipping update.");
    return;
  }

  const updated = await prisma.$executeRawUnsafe(`
    UPDATE "Cleaning"
    SET
      "attentionReason" = 'NO_CLEANER_ASSIGNED',
      "needsAttention" = true,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "tenantId" = '${hostTenantId}'
      AND ("teamId" IS NULL)
      AND ("assignedMembershipId" IS NULL)
      AND ("attentionReason" = 'NO_PROPERTY_TEAMS');
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
