import "dotenv/config";
import prisma from "@/lib/prisma";

const servicesTenantId = "c14d3e64-29ec-4c0e-bb3a-99cc505065c2";

async function main() {
  console.log("▶️ Cleanup Itzel Services tenant + links");
  console.log({ servicesTenantId });

  // 1) Borrar WorkGroupExecutor(s) que apuntan a este servicesTenant
  const delExec = await prisma.$executeRawUnsafe(`
    DELETE FROM "WorkGroupExecutor"
    WHERE "servicesTenantId" = '${servicesTenantId}';
  `);
  console.log("Deleted WorkGroupExecutor:", delExec);

  // 2) Borrar Teams del servicesTenant
  const delTeams = await prisma.$executeRawUnsafe(`
    DELETE FROM "Team"
    WHERE "tenantId" = '${servicesTenantId}';
  `);
  console.log("Deleted Team:", delTeams);

  // 3) Borrar Tenant
  const delTenant = await prisma.$executeRawUnsafe(`
    DELETE FROM "Tenant"
    WHERE "id" = '${servicesTenantId}';
  `);
  console.log("Deleted Tenant:", delTenant);

  // Verificación final
  const verify = await prisma.$queryRawUnsafe<Array<{ table: string; count: number }>>(`
    SELECT 'Team' AS table, count(*)::int AS count
    FROM "Team" WHERE "tenantId"='${servicesTenantId}'
    UNION ALL
    SELECT 'WorkGroupExecutor' AS table, count(*)::int AS count
    FROM "WorkGroupExecutor" WHERE "servicesTenantId"='${servicesTenantId}'
    UNION ALL
    SELECT 'Tenant' AS table, count(*)::int AS count
    FROM "Tenant" WHERE "id"='${servicesTenantId}';
  `);

  console.log("\n=== Verify deleted ===");
  console.table(verify);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
