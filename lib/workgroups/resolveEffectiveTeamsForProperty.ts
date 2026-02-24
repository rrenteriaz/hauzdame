import prisma from "@/lib/prisma";
import { getServiceTeamsForPropertyViaWorkGroups } from "./resolveWorkGroupsForProperty";

export type EffectiveTeamsSource = "WORKGROUP" | "PROPERTYTEAM_FALLBACK";

export type EffectiveTeamsResult = {
  source: EffectiveTeamsSource;
  teamIds: string[];
};

/**
 * Resolver de compatibilidad:
 * - Usa WorkGroups si existen datos (bridge WG -> Team).
 * - Si no hay datos WG, cae a PropertyTeam en tenant Host.
 */
export async function resolveEffectiveTeamsForProperty(
  hostTenantId: string,
  propertyId: string
): Promise<EffectiveTeamsResult> {
  const workGroupTeamIds = await getServiceTeamsForPropertyViaWorkGroups(
    hostTenantId,
    propertyId
  );

  if (workGroupTeamIds.length > 0) {
    return { source: "WORKGROUP", teamIds: workGroupTeamIds };
  }

  const propertyTeams = await (prisma as any).propertyTeam.findMany({
    where: {
      tenantId: hostTenantId,
      propertyId,
    },
    select: {
      teamId: true,
    },
  });

  const teamIds: string[] = Array.from(new Set(propertyTeams.map((pt: any) => pt.teamId) as string[])).sort();
  return { source: "PROPERTYTEAM_FALLBACK", teamIds };
}

