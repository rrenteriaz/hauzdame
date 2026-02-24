import prisma from "../lib/prisma";

async function main() {
  const props = await prisma.property.findMany({
    where: {
      OR: [
        { shortName: { in: ["Depa01", "Depa02", "Depa03", "Depa04", "Depa05", "Depa06"] } },
        { name: { in: ["Depa01", "Depa02", "Depa03", "Depa04", "Depa05", "Depa06"] } },
      ],
    },
    select: { id: true, shortName: true, name: true },
    orderBy: [{ shortName: "asc" }, { name: "asc" }],
  });

  const ids = props.map((p) => p.id);

  const rows = await prisma.$queryRawUnsafe<
    Array<{ propertyId: string; teamId: string; tenantId: string }>
  >(
    'select "propertyId", "teamId", "tenantId" from "PropertyTeam" where "propertyId" = ANY($1) order by "propertyId"',

    ids
  );

  console.log("props", props.length);
  console.log(props);
  console.log("rows", rows.length);
  console.log(rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
