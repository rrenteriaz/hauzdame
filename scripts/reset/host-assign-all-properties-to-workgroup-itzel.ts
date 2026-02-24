import "dotenv/config";
import prisma from "@/lib/prisma";

const tenantId = "cmkptilbc0000x4o7lvmlls57";
const workGroupId = "cmkpvrslw00005oo70cbazdmr"; // Itzel (WG)

async function main() {
  console.log("▶️ Assign all properties to WorkGroup");
  console.log({ tenantId, workGroupId });

  // Insert idempotente: crea links que no existan
  const inserted = await prisma.$executeRawUnsafe(`
    INSERT INTO "HostWorkGroupProperty" ("id", "tenantId", "workGroupId", "propertyId", "createdAt")
    SELECT
      gen_random_uuid()::text,
      p."tenantId",
      '${workGroupId}',
      p."id",
      CURRENT_TIMESTAMP
    FROM "Property" p
    WHERE p."tenantId" = '${tenantId}'
      AND NOT EXISTS (
        SELECT 1
        FROM "HostWorkGroupProperty" hwp
        WHERE hwp."propertyId" = p."id"
          AND hwp."workGroupId" = '${workGroupId}'
      );
  `);

  console.log("Rows inserted:", inserted);

  const total = await prisma.$queryRawUnsafe<Array<{ total: number }>>(`
    SELECT count(*)::int AS total
    FROM "HostWorkGroupProperty"
    WHERE "tenantId" = '${tenantId}'
      AND "workGroupId" = '${workGroupId}';
  `);

  console.log("Total links for WG:", total[0]?.total ?? "n/a");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
