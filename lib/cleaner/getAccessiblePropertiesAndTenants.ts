// lib/cleaner/getAccessiblePropertiesAndTenants.ts
// Helper canónico para obtener propiedades accesibles y tenantIds correctos para queries de Cleaning

import prisma from "@/lib/prisma";
import { getAccessibleHostTenantIdsForUser } from "./getAccessibleHostTenantIdsForUser";
import { getAccessibleTenantIdsForUser } from "./getAccessibleTenantIdsForUser";

export interface AccessiblePropertiesResult {
  propertyIds: string[];
  tenantIds: string[]; // Tenant IDs donde están las Cleanings (hostTenantIds cuando hay WGE, property tenantIds cuando hay PropertyTeam)
  source: "WGE" | "PROPERTY_TEAM";
}

/**
 * Obtiene las propiedades accesibles y los tenantIds correctos para filtrar Cleanings.
 * 
 * Prioriza WorkGroupExecutor sobre PropertyTeam.
 * 
 * IMPORTANTE: Los tenantIds devueltos son los tenantIds donde están las Cleanings,
 * no necesariamente los tenantIds de los Teams.
 * 
 * @param userId - ID del usuario cleaner
 * @param teamIds - IDs de los teams del cleaner
 * @returns Objeto con propertyIds y tenantIds para filtrar Cleanings
 */
export async function getAccessiblePropertiesAndTenants(
  userId: string,
  teamIds: string[]
): Promise<AccessiblePropertiesResult> {
  if (teamIds.length === 0) {
    return { propertyIds: [], tenantIds: [], source: "PROPERTY_TEAM" };
  }

  // Paso 1: Intentar obtener propiedades vía WorkGroupExecutor (prioridad)
  const { getPropertiesForCleanerTeamsViaWGE } = await import("@/lib/workgroups/getPropertiesForCleanerTeamViaWGE");
  const wgePropertyIds = await getPropertiesForCleanerTeamsViaWGE(teamIds);

  if (wgePropertyIds.length > 0) {
    // Usar propiedades vía WGE
    const hostTenantIds = await getAccessibleHostTenantIdsForUser(userId);
    return {
      propertyIds: wgePropertyIds,
      tenantIds: hostTenantIds,
      source: "WGE",
    };
  }

  // Paso 2: Fallback a PropertyTeam
  const servicesTenantIds = await getAccessibleTenantIdsForUser(userId);
  if (servicesTenantIds.length === 0) {
    return { propertyIds: [], tenantIds: [], source: "PROPERTY_TEAM" };
  }

  const propertyTeams = await (prisma as any).propertyTeam.findMany({
    where: {
      tenantId: { in: servicesTenantIds },
      teamId: { in: teamIds },
    },
    select: {
      propertyId: true,
      property: {
        select: {
          id: true,
          isActive: true,
          tenantId: true, // Obtener tenantId de la Property (donde está la Cleaning)
        },
      },
    },
  });

  const activePropertyTeams = propertyTeams.filter(
    (pt: { property: { isActive: boolean | null; tenantId: string | null } | null }) =>
      pt.property?.isActive !== false
  );

  const propertyIds = activePropertyTeams.map((pt: { propertyId: string }) => pt.propertyId);
  
  // Obtener tenantIds de las Properties (donde están las Cleanings)
  const propertyTenantIdsRaw = activePropertyTeams.map(
    (pt: { property: { tenantId: string | null } | null }) => pt.property?.tenantId
  );
  const propertyTenantIds = propertyTenantIdsRaw.filter(
    (id: string | null | undefined): id is string => Boolean(id)
  );

  return {
    propertyIds,
    tenantIds: Array.from(new Set(propertyTenantIds)),
    source: "PROPERTY_TEAM",
  };
}

