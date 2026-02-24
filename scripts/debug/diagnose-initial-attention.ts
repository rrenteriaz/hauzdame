import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const propertyTeamsCount = await prisma.$queryRawUnsafe<
    Array<{ propertyteams: number }>
  >(`
    SELECT count(*)::int AS propertyteams
    FROM "PropertyTeam";
  `);

  const propertiesWithoutTeams = await prisma.$queryRawUnsafe<
    Array<{ properties_without_teams: number }>
  >(`
    SELECT count(*)::int AS properties_without_teams
    FROM "Property" p
    LEFT JOIN "PropertyTeam" pt ON pt."propertyId" = p."id"
    WHERE pt."propertyId" IS NULL;
  `);

  const cleanings = await prisma.$queryRawUnsafe<
    Array<{ total: number; with_null_property: number }>
  >(`
    SELECT
      count(*)::int AS total,
      sum(CASE WHEN c."propertyId" IS NULL THEN 1 ELSE 0 END)::int AS with_null_property
    FROM "Cleaning" c;
  `);

  console.log("\n=== Diagnose initial attention ===");
  console.table(propertyTeamsCount);
  console.table(propertiesWithoutTeams);
  console.table(cleanings);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
