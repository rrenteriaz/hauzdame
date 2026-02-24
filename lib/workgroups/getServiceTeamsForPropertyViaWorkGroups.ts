// lib/workgroups/getServiceTeamsForPropertyViaWorkGroups.ts
// Helper para migración gradual: obtiene teams ejecutores vía WorkGroups si existen,
// si no existen aún, fallback a PropertyTeam (para no romper durante transición)

import prisma from "@/lib/prisma";
import { getServiceTeamsForPropertyViaWorkGroups as getViaWorkGroupsDirect } from "./resolveWorkGroupsForProperty";

/**
 * Obtiene los teamIds de Services para una propiedad con fallback a PropertyTeam.
 * Prioriza WorkGroups si existen, fallback a PropertyTeam durante transición.
 * 
 * Esta función es un wrapper de getServiceTeamsForPropertyViaWorkGroups que agrega
 * fallback a PropertyTeam para migración gradual.
 */
export async function getServiceTeamsForPropertyViaWorkGroupsWithFallback(
  hostTenantId: string,
  propertyId: string
): Promise<string[]> {
  // PASO 1: Intentar obtener teams vía WorkGroups
  const workGroupTeamIds = await getViaWorkGroupsDirect(hostTenantId, propertyId);
  
  if (workGroupTeamIds.length > 0) {
    // Si hay teams vía WorkGroups, usarlos (prioridad)
    return workGroupTeamIds;
  }

  // PASO 2: Fallback a PropertyTeam (durante transición)
  // Esto permite que Host siga funcionando mientras migramos gradualmente
  const propertyTeams = await (prisma as any).propertyTeam.findMany({
    where: {
      tenantId: hostTenantId,
      propertyId,
    },
    select: {
      teamId: true,
    },
  });

  const fallbackTeamIds = propertyTeams.map((pt: any) => pt.teamId);
  
  // Si hay teams vía PropertyTeam, usarlos
  if (fallbackTeamIds.length > 0) {
    return fallbackTeamIds.sort();
  }

  // Si no hay ninguno, retornar array vacío
  return [];
}

