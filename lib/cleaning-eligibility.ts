// lib/cleaning-eligibility.ts
import { cache } from "react";
import prisma from "@/lib/prisma";
import { resolveEffectiveTeamsForProperty } from "@/lib/workgroups/resolveEffectiveTeamsForProperty";

/**
 * Función interna cacheada por React para memoization segura por request.
 * React cache() garantiza que el resultado se comparte dentro del mismo request,
 * pero cada request tiene su propio cache aislado.
 * 
 * Key implícita: React usa los argumentos (tenantId, propertyId, dateKey) como key.
 */
const getEligibleMembersForCleaningCached = cache(
  async (
    tenantId: string,
    propertyId: string,
    dateKey: string,
    scheduledDate: Date
  ): Promise<Array<{ id: string; name: string; teamId: string; teamName: string }>> => {
    return getEligibleMembersForCleaningInternal(tenantId, propertyId, scheduledDate);
  }
);

/**
 * Obtiene los miembros elegibles para una limpieza basándose en:
 * - Equipos asignados a la propiedad
 * - Miembros activos
 * - Horarios de trabajo por día (TeamMemberScheduleDay)
 * 
 * Estrategia de optimización: React cache() por request con key (tenantId, propertyId, día)
 * para evitar queries duplicadas cuando múltiples limpiezas comparten propiedad y fecha.
 * Cada request tiene su propio cache aislado, garantizando seguridad multi-tenant.
 */
export async function getEligibleMembersForCleaning(
  tenantId: string,
  propertyId: string,
  scheduledDate: Date
): Promise<Array<{ id: string; name: string; teamId: string; teamName: string }>> {
  // Generar key de cache: YYYY-MM-DD (agrupa por día)
  const dateKey = scheduledDate.toISOString().split('T')[0];
  
  // React cache() usa los argumentos como key implícita
  return getEligibleMembersForCleaningCached(tenantId, propertyId, dateKey, scheduledDate);
}

/**
 * Implementación interna sin cache (llamada por la función pública con cache)
 */
async function getEligibleMembersForCleaningInternal(
  tenantId: string,
  propertyId: string,
  scheduledDate: Date
): Promise<Array<{ id: string; name: string; teamId: string; teamName: string }>> {
  const useWorkGroupReads = process.env.WORKGROUP_READS_ENABLED === "1";
  const effectiveTeams = useWorkGroupReads
    ? await resolveEffectiveTeamsForProperty(tenantId, propertyId)
    : null;

  let propertyTeams: any[] = [];
  if (useWorkGroupReads && effectiveTeams?.source === "WORKGROUP") {
    const teams = await prisma.team.findMany({
      where: {
        id: { in: effectiveTeams.teamIds },
        status: "ACTIVE",
      },
      include: {
        members: {
          where: {
            tenantId,
            isActive: true,
          },
          include: {
            scheduleDays: {
              where: {
                tenantId,
              },
            },
          },
        },
      },
    });
    propertyTeams = teams.map((team) => ({
      teamId: team.id,
      tenantId,
      propertyId,
      team,
    }));
  } else {
    // FASE 5: Obtener equipos asignados a la propiedad (usar propertyId)
    propertyTeams = await (prisma as any).propertyTeam.findMany({
      where: {
        tenantId,
        propertyId: propertyId, // FASE 5: propertyId ahora es el PK directamente
        team: { status: "ACTIVE" },
      },
      include: {
        team: {
          include: {
            members: {
              where: {
                tenantId,
                isActive: true,
              },
              include: {
                scheduleDays: {
                  where: {
                    tenantId,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // Obtener el día de la semana de la limpieza (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
  const dayOfWeek = scheduledDate.getDay();

  // Recopilar todos los miembros elegibles
  const eligibleMembers: Array<{ id: string; name: string; teamId: string; teamName: string }> = [];

  for (const pt of propertyTeams) {
    if (!pt.team?.members) continue;

    for (const member of pt.team.members) {
      // Buscar el scheduleDay correspondiente al día de la limpieza
      const scheduleDay = member.scheduleDays?.find((sd: any) => sd.dayOfWeek === dayOfWeek);

      // Si no tiene scheduleDay configurado, usar fallback a workingDays (compatibilidad)
      let isEligible = false;

      if (scheduleDay) {
        // Usar el nuevo modelo: isWorking determina elegibilidad
        isEligible = scheduleDay.isWorking === true;
      } else {
        // Fallback: usar workingDays antiguo (para compatibilidad durante migración)
        const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        const cleaningDay = dayNames[dayOfWeek];
        let workingDays = member.workingDays;
        if (!workingDays || !Array.isArray(workingDays) || workingDays.length === 0) {
          // Default: todos los días (para compatibilidad)
          workingDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
        }
        isEligible = workingDays.includes(cleaningDay);
      }

      if (isEligible) {
        eligibleMembers.push({
          id: member.id,
          name: member.name,
          teamId: member.teamId,
          teamName: pt.team.name,
        });
      }
    }
  }

  // Eliminar duplicados (por si un miembro está en múltiples equipos asignados)
  const uniqueMembers = Array.from(
    new Map(eligibleMembers.map((m) => [m.id, m])).values()
  );

  return uniqueMembers;
}
