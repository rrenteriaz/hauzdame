import prisma from "@/lib/prisma";

export async function getAccessibleTeamsForUser(userId: string) {
  const memberships: any[] = await (prisma as any).teamMembership.findMany({
    where: { userId, status: "ACTIVE" },
    select: {
      teamId: true,
      Team: {
        select: {
          tenantId: true,
          status: true,
        },
      },
    },
  });

  const allTeamIds = memberships.map((m) => m.teamId);
  const activeTeamIds = memberships
    .filter((m) => (m.Team?.status ?? "ACTIVE") === "ACTIVE")
    .map((m) => m.teamId);
  const tenantIds = memberships
    .map((m) => m.Team?.tenantId)
    .filter((id): id is string => Boolean(id));

  return {
    allTeamIds: Array.from(new Set(allTeamIds)),
    activeTeamIds: Array.from(new Set(activeTeamIds)),
    tenantIds: Array.from(new Set(tenantIds)),
  };
}

