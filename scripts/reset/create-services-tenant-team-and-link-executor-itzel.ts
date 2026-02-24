import "dotenv/config";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

const hostTenantId = "cmkptilbc0000x4o7lvmlls57";
const workGroupId = "cmkpvrslw00005oo70cbazdmr"; // Itzel (WG)

async function main() {
  console.log("▶️ Create services tenant + ItzelTeam + WorkGroupExecutor");
  console.log({ hostTenantId, workGroupId });

  // 1) Create Services Tenant
  // Usamos create directo con id UUID porque Tenant.id es text (en tu DB).
  // Si tu Tenant tiene campos obligatorios extra, esto fallará y ajustamos.
  const servicesTenant = await prisma.tenant.create({
    data: {
      id: randomUUID(),
      name: "Itzel Services",
      slug: "itzel-services",
      // Si tu schema requiere type/role/etc, aquí nos dirá.
    } as any,
    select: { id: true, name: true, slug: true },
  });

  console.log("✅ Services Tenant created:", servicesTenant);

  // 2) Create Team in services tenant
  const team = await prisma.team.create({
    data: {
      id: randomUUID(),
      tenantId: servicesTenant.id,
      name: "ItzelTeam",
      updatedAt: new Date(), // required
      // status default ACTIVE
    },
    select: { id: true, name: true, tenantId: true },
  });

  console.log("✅ Services Team created:", team);

  // 3) Create WorkGroupExecutor link (SQL raw porque quizá no está en Prisma client)
  const inserted = await prisma.$executeRawUnsafe(`
    INSERT INTO "WorkGroupExecutor" (
      "id",
      "hostTenantId",
      "workGroupId",
      "servicesTenantId",
      "teamId",
      "status",
      "createdAt",
      "updatedAt"
    ) VALUES (
      gen_random_uuid()::text,
      '${hostTenantId}',
      '${workGroupId}',
      '${servicesTenant.id}',
      '${team.id}',
      'ACTIVE',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ WorkGroupExecutor inserted rows:", inserted);

  const verify = await prisma.$queryRawUnsafe<
    Array<{ count: number }>
  >(`
    SELECT count(*)::int AS count
    FROM "WorkGroupExecutor"
    WHERE "hostTenantId" = '${hostTenantId}'
      AND "workGroupId" = '${workGroupId}';
  `);

  console.log("✅ WorkGroupExecutor count for WG:", verify[0]?.count ?? "n/a");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
