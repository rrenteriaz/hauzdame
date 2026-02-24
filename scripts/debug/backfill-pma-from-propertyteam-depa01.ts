import "dotenv/config";
import prisma from "@/lib/prisma";

const propertyId = "h02mv7zdql06n3kerxn2vnth";

async function main() {
  console.log("▶️ Backfill PMA from PropertyTeam for:", propertyId);

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true, tenantId: true },
  });
  if (!property) {
    console.log("❌ Propiedad no encontrada");
    return;
  }

  console.log("\n🏠 PROPERTY");
  console.log(property);

  const pt = await prisma.propertyTeam.findFirst({
    where: { propertyId },
    select: { id: true, teamId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (!pt) {
    console.log("\n⚠️ No hay PropertyTeam para esta propiedad. No hay nada que backfillear.");
    return;
  }

  console.log("\n🔗 PROPERTY TEAM");
  console.table([pt]);

  // memberships ACTIVE del team asignado
  const memberships = await prisma.teamMembership.findMany({
    where: { teamId: pt.teamId, status: "ACTIVE" },
    select: { id: true, teamId: true, userId: true, role: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n👥 TEAM MEMBERSHIPS ACTIVE del team asignado");
  console.table(memberships);

  const propertyMemberAccess = (prisma as any).propertyMemberAccess;
  if (!propertyMemberAccess) {
    console.log("\n❌ prisma.propertyMemberAccess no existe. ¿Ya corriste prisma generate?");
    return;
  }

  // createMany skipDuplicates usando unique(propertyId, teamMembershipId)
  const data = memberships.map((m) => ({
    propertyId,
    teamMembershipId: m.id,
    userId: null,
    accessRole: "CLEANER",
    status: "ACTIVE",
  }));

  if (data.length === 0) {
    console.log("\n⚠️ No hay memberships ACTIVE. No se insertó nada.");
    return;
  }

  const result = await propertyMemberAccess.createMany({
    data,
    skipDuplicates: true,
  });

  console.log("\n✅ createMany result:", result);

  const after = await propertyMemberAccess.findMany({
    where: { propertyId },
    select: {
      id: true,
      propertyId: true,
      status: true,
      accessRole: true,
      userId: true,
      teamMembershipId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n🔐 PROPERTY MEMBER ACCESS (AFTER)");
  console.table(after);

  console.log("\n✅ Fin backfill.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
