// lib/cleaner/getAccessibleHostTenantIdsForUser.ts
// Helper para obtener hostTenantIds accesibles por un cleaner vía WorkGroupExecutor

import prisma from "@/lib/prisma";

/**
 * Obtiene los hostTenantIds accesibles por un cleaner.
 * 
 * Un hostTenantId es accesible si:
 * 1. El cleaner tiene un TeamMembership ACTIVE en un Team
 * 2. Ese Team tiene un WorkGroupExecutor ACTIVE que apunta a ese hostTenantId
 * 
 * IMPORTANTE: Este helper solo devuelve hostTenantIds, NO servicesTenantIds.
 * 
 * @param userId - ID del usuario cleaner
 * @returns Array de hostTenantIds únicos accesibles por el cleaner
 */
export async function getAccessibleHostTenantIdsForUser(
  userId: string
): Promise<string[]> {
  // Paso 1: Obtener TeamMemberships ACTIVE del usuario
  const memberships = await prisma.teamMembership.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
    select: {
      teamId: true,
    },
  });

  if (memberships.length === 0) {
    return [];
  }

  const teamIds = memberships.map((m) => m.teamId);

  // Paso 2: Obtener WorkGroupExecutors ACTIVE para esos teams
  const executors = await prisma.workGroupExecutor.findMany({
    where: {
      teamId: { in: teamIds },
      status: "ACTIVE",
    },
    select: {
      hostTenantId: true,
      workGroupId: true,
    },
  });

  if (executors.length === 0) {
    return [];
  }

  // Paso 3: Verificar que los WorkGroups estén ACTIVE
  // Solo incluir hostTenantIds de WorkGroups que estén activos
  const workGroupIds = Array.from(new Set(executors.map((e) => e.workGroupId)));
  
  const activeWorkGroups = await prisma.hostWorkGroup.findMany({
    where: {
      id: { in: workGroupIds },
      status: "ACTIVE",
    },
    select: {
      id: true,
      tenantId: true,
    },
  });

  const activeWorkGroupIds = new Set(activeWorkGroups.map((wg) => wg.id));

  // Paso 4: Filtrar executors por WorkGroups activos y extraer hostTenantIds únicos
  const hostTenantIds = executors
    .filter((e) => activeWorkGroupIds.has(e.workGroupId))
    .map((e) => e.hostTenantId)
    .filter((id): id is string => Boolean(id));

  return Array.from(new Set(hostTenantIds));
}

