import "dotenv/config";
import prisma from "@/lib/prisma";

const propertyId = "h02mv7zdql06n3kerxn2vnth";

async function main() {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      name: true,
      tenantId: true,
    },
  });

  if (!property) {
    console.log("❌ Propiedad no encontrada para id:", propertyId);
    return;
  }

  console.log("\n🏠 PROPERTY");
  console.log(property);

  // PropertyMemberAccess vive en schema nuevo; usamos (prisma as any) para evitar errores de tipado
  const pma = (prisma as any).propertyMemberAccess;

  // 2) PropertyMemberAccess (accesos por propiedad)
  const accessRows = await pma.findMany({
    where: { propertyId: property.id },
    select: {
      id: true,
      propertyId: true,
      status: true,
      accessRole: true, // CLEANER | MANAGER (según tu schema)
      userId: true, // si aplica
      teamMembershipId: true, // si aplica
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n🔐 PROPERTY MEMBER ACCESS (por property)");
  console.table(accessRows);

  // 2b) Enriquecer userIds (si existen)
  const userIds = accessRows.map((r: any) => r.userId).filter(Boolean);
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true, role: true, tenantId: true },
    });

    console.log("\n👤 USERS (de PropertyMemberAccess.userId)");
    console.table(users);
  } else {
    console.log("\n👤 USERS: (sin userId en PropertyMemberAccess para esta property)");
  }

  // 2c) Enriquecer teamMembershipIds (si existen)
  const membershipIds = accessRows.map((r: any) => r.teamMembershipId).filter(Boolean);
  if (membershipIds.length > 0) {
    const memberships = await prisma.teamMembership.findMany({
      where: { id: { in: membershipIds } },
      select: { id: true, teamId: true, userId: true, role: true, status: true, createdAt: true },
    });

    console.log("\n👥 TEAM MEMBERSHIPS (de PropertyMemberAccess.teamMembershipId)");
    console.table(memberships);

    const membershipUserIds = memberships.map((m) => m.userId).filter(Boolean);
    if (membershipUserIds.length > 0) {
      const membershipUsers = await prisma.user.findMany({
        where: { id: { in: membershipUserIds } },
        select: { id: true, email: true, name: true, role: true, tenantId: true },
      });

      console.log("\n👤 USERS (de TeamMembership.userId)");
      console.table(membershipUsers);
    }
  } else {
    console.log("\n👥 TEAM MEMBERSHIPS: (sin teamMembershipId en PropertyMemberAccess para esta property)");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
