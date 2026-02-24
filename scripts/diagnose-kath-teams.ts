import "dotenv/config";
import prisma from "@/lib/prisma";

const KATH_USER_ID = "cmk08fe3y0007coo7xrqzl2i2";
const NON_ORGANIC_TENANT_SLUGS = ["hausdame-demo", "ranferi-airbnb"];

async function main() {
  const kathUser = await prisma.user.findUnique({
    where: { id: KATH_USER_ID },
    select: { id: true, name: true, email: true },
  });

  if (!kathUser) {
    console.log("No se encontró usuario para Kath con el userId provisto.");
    process.exit(1);
  }

  console.log("Kath:", kathUser);

  const kathMemberships = await prisma.teamMembership.findMany({
    where: {
      userId: kathUser.id,
      status: "ACTIVE",
    },
    select: {
      teamId: true,
      role: true,
    },
  });

  const teamIds = Array.from(new Set(kathMemberships.map((m) => m.teamId)));

  const rows = [];
  let teamsWithMultipleTl = 0;
  for (const teamId of teamIds) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, tenantId: true, status: true, createdAt: true, name: true },
    });

    const tenant = team
      ? await prisma.tenant.findUnique({
          where: { id: team.tenantId },
          select: { id: true, slug: true, name: true },
        })
      : null;

    const teamLeaders = await prisma.teamMembership.findMany({
      where: { teamId, role: "TEAM_LEADER", status: "ACTIVE" },
      select: {
        userId: true,
        User: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    if (teamLeaders.length > 1) {
      teamsWithMultipleTl += 1;
    }
    const teamLeader = teamLeaders[0] ?? null;

    const kathMembership = await prisma.teamMembership.findFirst({
      where: { teamId, userId: kathUser.id },
      select: { id: true, role: true, status: true, createdAt: true },
    });

    const propertiesCount = await (prisma as any).propertyTeam.count({
      where: { teamId },
    });

    rows.push({
      teamId,
      teamStatus: team?.status ?? null,
      tenantSlug: tenant?.slug ?? null,
      tenantName: tenant?.name ?? null,
      tlEmail: teamLeader?.User?.email ?? null,
      tlName: teamLeader?.User?.name ?? null,
      kathRole: kathMembership?.role ?? null,
      kathStatus: kathMembership?.status ?? null,
      propertiesCount,
    });
  }

  console.table(rows);

  const kathTlCount = kathMemberships.filter((m) => m.role === "TEAM_LEADER").length;
  console.log("Kath TL memberships (ACTIVE):", kathTlCount);
  console.log("Teams con multiples TL ACTIVE:", teamsWithMultipleTl);

  const nonOrganicTenants = await prisma.tenant.findMany({
    where: { slug: { in: NON_ORGANIC_TENANT_SLUGS } },
    select: { id: true, slug: true, name: true },
  });
  const nonOrganicTenantIds = nonOrganicTenants.map((t) => t.id);

  const nonOrganicTeams = nonOrganicTenantIds.length
    ? await prisma.team.findMany({
        where: { tenantId: { in: nonOrganicTenantIds } },
        select: { id: true, tenantId: true, name: true },
      })
    : [];
  const nonOrganicTeamIds = nonOrganicTeams.map((t) => t.id);

  const kathMembershipsInNonOrganic = await prisma.teamMembership.findMany({
    where: {
      userId: kathUser.id,
      teamId: { in: nonOrganicTeamIds },
    },
    select: { teamId: true, role: true, status: true },
  });

  console.log("Tenants no orgánicos:", nonOrganicTenants);
  console.log("Kath memberships en tenants no orgánicos:", kathMembershipsInNonOrganic);

  // Opción 4A: impacto (solo memberships de Cleaners en tenants no orgánicos)
  const nonOrganicCleanerMembershipsCount = await prisma.teamMembership.count({
    where: {
      teamId: { in: nonOrganicTeamIds },
      role: { in: ["TEAM_LEADER", "CLEANER"] },
    },
  });
  console.log("Impacto 4A (memberships TL/CLEANER en tenants no orgánicos):", {
    teamMemberships: nonOrganicCleanerMembershipsCount,
    teams: nonOrganicTeamIds.length,
    tenants: nonOrganicTenantIds.length,
  });

  // Opción 4B: impacto (eliminar tenants no orgánicos completos)
  const [
    teamsCount,
    teamMembershipsCount,
    propertiesCount,
    teamInvitesCount,
    cleaningsCount,
    reservationsCount,
  ] = await Promise.all([
    prisma.team.count({ where: { tenantId: { in: nonOrganicTenantIds } } }),
    prisma.teamMembership.count({ where: { teamId: { in: nonOrganicTeamIds } } }),
    prisma.property.count({ where: { tenantId: { in: nonOrganicTenantIds } } }),
    prisma.teamInvite.count({ where: { teamId: { in: nonOrganicTeamIds } } }),
    prisma.cleaning.count({ where: { tenantId: { in: nonOrganicTenantIds } } }),
    prisma.reservation.count({ where: { tenantId: { in: nonOrganicTenantIds } } }),
  ]);

  const propertyTeamsCount = await (prisma as any).propertyTeam.count({
    where: { teamId: { in: nonOrganicTeamIds } },
  });

  console.log("Impacto 4B (conteos por tabla, tenants no orgánicos):", {
    tenants: nonOrganicTenantIds.length,
    teams: teamsCount,
    teamMemberships: teamMembershipsCount,
    properties: propertiesCount,
    propertyTeams: propertyTeamsCount,
    teamInvites: teamInvitesCount,
    cleanings: cleaningsCount,
    reservations: reservationsCount,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

