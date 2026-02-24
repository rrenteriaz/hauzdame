import "dotenv/config";
import prisma from "@/lib/prisma";

const servicesTenantId = "c14d3e64-29ec-4c0e-bb3a-99cc505065c2";

async function main() {
  const counts = await prisma.$queryRawUnsafe<
    Array<{ table: string; count: number }>
  >(`
    SELECT 'Team' AS table, count(*)::int AS count
    FROM "Team" WHERE "tenantId"='${servicesTenantId}'
    UNION ALL
    SELECT 'WorkGroupExecutor' AS table, count(*)::int AS count
    FROM "WorkGroupExecutor" WHERE "servicesTenantId"='${servicesTenantId}'
    UNION ALL
    SELECT 'User' AS table, count(*)::int AS count
    FROM "User" WHERE "tenantId"='${servicesTenantId}'
    UNION ALL
    SELECT 'TeamMembership' AS table, count(*)::int AS count
    FROM "TeamMembership" tm
    JOIN "Team" t ON t."id"=tm."teamId"
    WHERE t."tenantId"='${servicesTenantId}'
    UNION ALL
    SELECT 'TeamMember' AS table, count(*)::int AS count
    FROM "TeamMember" WHERE "tenantId"='${servicesTenantId}'
    UNION ALL
    SELECT 'TeamInvite' AS table, count(*)::int AS count
    FROM "TeamInvite" ti
    JOIN "Team" t ON t."id"=ti."teamId"
    WHERE t."tenantId"='${servicesTenantId}';
  `);

  console.log("\n=== References to services tenant ===");
  console.table(counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
