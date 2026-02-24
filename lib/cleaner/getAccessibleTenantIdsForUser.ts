import prisma from "@/lib/prisma";

export async function getAccessibleTenantIdsForUser(userId: string): Promise<string[]> {
  const memberships = await prisma.teamMembership.findMany({
    where: { userId, status: "ACTIVE" },
    select: {
      Team: {
        select: { tenantId: true },
      },
    },
  });

  const tenantIds = memberships
    .map((m) => m.Team?.tenantId)
    .filter((id): id is string => Boolean(id));

  return Array.from(new Set(tenantIds));
}

