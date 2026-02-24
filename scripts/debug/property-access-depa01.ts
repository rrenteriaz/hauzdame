import "dotenv/config";
import prisma from "@/lib/prisma";

const propertyId = "h02mv7zdql06n3kerxn2vnth";

async function main() {
  console.log("▶️ Debug Property Access for propertyId:", propertyId);

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true, tenantId: true },
  });

  if (!property) {
    console.log("❌ Propiedad no encontrada para id:", propertyId);
    return;
  }

  console.log("\n🏠 PROPERTY");
  console.log(property);

  // 1) PropertyTeam (Host asigna equipos a property)
  const propertyTeams = await prisma.propertyTeam.findMany({
    where: { propertyId: property.id },
    select: { id: true, propertyId: true, teamId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n🔗 PROPERTY TEAM (property ↔ team)");
  if (propertyTeams.length === 0) {
    console.log("⚠️ No hay PropertyTeam rows para esta propiedad.");
  } else {
    console.table(propertyTeams);
  }

  // 2) PropertyMemberAccess (nueva capa: userId OR teamMembershipId)
  const propertyMemberAccess = (prisma as any).propertyMemberAccess;

  if (!propertyMemberAccess) {
    console.log(
      "\n❌ prisma.propertyMemberAccess no existe en el client. " +
        "¿Ya corriste prisma generate después de la migración?"
    );
    return;
  }

  const pmaRows = await propertyMemberAccess.findMany({
    where: { propertyId: property.id },
    select: {
      id: true,
      propertyId: true,
      status: true,
      accessRole: true,
      userId: true,
      teamMembershipId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n🔐 PROPERTY MEMBER ACCESS (PropertyMemberAccess)");
  if (pmaRows.length === 0) {
    console.log("⚠️ No hay PropertyMemberAccess rows para esta propiedad.");
  } else {
    console.table(pmaRows);
  }

  // 3) Enriquecer: si hay teamMembershipId, traemos membership + user
  const membershipIds = pmaRows.map((r: any) => r.teamMembershipId).filter(Boolean);
  if (membershipIds.length > 0) {
    const memberships = await prisma.teamMembership.findMany({
      where: { id: { in: membershipIds } },
      select: {
        id: true,
        teamId: true,
        userId: true,
        role: true,
        status: true,
        User: { select: { id: true, email: true, name: true, role: true, tenantId: true } },
      },
    });

    console.log("\n👤 MEMBERSHIPS referenciados por PropertyMemberAccess.teamMembershipId");
    console.table(
      memberships.map((m) => ({
        membershipId: m.id,
        teamId: m.teamId,
        memberUserId: m.userId,
        memberEmail: m.User?.email,
        memberName: m.User?.name,
        memberRole: m.role,
        memberStatus: m.status,
        userRole: m.User?.role,
        userTenantId: m.User?.tenantId,
      }))
    );
  } else {
    console.log("\nℹ️ No hay teamMembershipId en PropertyMemberAccess para esta propiedad.");
  }

  // 4) Enriquecer: si hay userId directo, traemos users
  const userIds = pmaRows.map((r: any) => r.userId).filter(Boolean);
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true, role: true, tenantId: true },
    });

    console.log("\n👥 USERS referenciados por PropertyMemberAccess.userId");
    console.table(users);
  } else {
    console.log("\nℹ️ No hay userId directo en PropertyMemberAccess para esta propiedad.");
  }

  console.log("\n✅ Fin debug.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
