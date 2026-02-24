import prisma from "@/lib/prisma";
import { getServiceTeamsForPropertyViaWorkGroups } from "./resolveWorkGroupsForProperty";

export type AvailableTeamsResult = {
  teamIds: string[];
  sourceBreakdown: {
    workGroupCount: number;
    propertyTeamCount: number;
  };
};

/**
 * Resuelve equipos disponibles para una propiedad haciendo UNION de ambas fuentes:
 * - WorkGroups (HostWorkGroupProperty + WorkGroupExecutor ACTIVE)
 * - PropertyTeam legacy (con Team.status=ACTIVE)
 * 
 * Esta función SIEMPRE consulta ambas fuentes, independientemente del flag WORKGROUP_READS_ENABLED.
 * Esto asegura que las alertas y niveles de asignación sean precisos.
 * 
 * @param hostTenantId ID del tenant Host
 * @param propertyId ID de la propiedad
 * @returns Equipos disponibles (deduplicados) y breakdown de fuentes (solo para debug)
 */
export async function resolveAvailableTeamsForProperty(
  hostTenantId: string,
  propertyId: string
): Promise<AvailableTeamsResult> {
  // 1) Obtener equipos via WorkGroups (siempre consultar, no depende del flag)
  const workGroupTeamIds = await getServiceTeamsForPropertyViaWorkGroups(
    hostTenantId,
    propertyId
  );

  // 2) Obtener equipos via PropertyTeam legacy (siempre consultar)
  const propertyTeams = await (prisma as any).propertyTeam.findMany({
    where: {
      tenantId: hostTenantId,
      propertyId,
      team: { status: "ACTIVE" },
    },
    select: {
      teamId: true,
    },
  });

  const propertyTeamIds = Array.from(
    new Set(propertyTeams.map((pt: any) => pt.teamId as string))
  );

  // 3) UNION de ambas fuentes (deduplicar)
  const allTeamIds = Array.from(
    new Set([...workGroupTeamIds, ...propertyTeamIds])
  ).sort();

  // 4) Verificación de scoping (solo en dev, para detectar problemas)
  if (process.env.NODE_ENV === "development") {
    // Verificar que si hay WorkGroups asignados, deberían aparecer en el resultado
    const workGroupLinks = await prisma.hostWorkGroupProperty.findMany({
      where: {
        tenantId: hostTenantId,
        propertyId,
      },
      select: {
        workGroupId: true,
      },
    });

    if (workGroupLinks.length > 0 && workGroupTeamIds.length === 0) {
      console.warn(
        `[resolveAvailableTeamsForProperty] Propiedad ${propertyId} tiene ${workGroupLinks.length} WorkGroup(s) asignado(s) pero no se encontraron ejecutores activos. Verificar WorkGroupExecutor.status.`
      );
    }
  }

  return {
    teamIds: allTeamIds,
    sourceBreakdown: {
      workGroupCount: workGroupTeamIds.length,
      propertyTeamCount: propertyTeamIds.length,
    },
  } as AvailableTeamsResult;
}

