// lib/workgroups/getPropertiesForCleanerTeamViaWGE.ts
// Helper para obtener propertyIds accesibles por un Team vía WorkGroupExecutor

import prisma from "@/lib/prisma";

/**
 * Obtiene los propertyIds accesibles por un teamId vía WorkGroupExecutor.
 * 
 * Flujo:
 * 1. Buscar WorkGroupExecutor ACTIVE donde teamId = X
 * 2. Obtener workGroupIds de esos executors
 * 3. Buscar HostWorkGroupProperty donde workGroupId IN (workGroupIds)
 * 4. Retornar propertyIds únicos
 * 
 * @param teamId - ID del Team (Services domain)
 * @returns Array de propertyIds accesibles
 */
export async function getPropertiesForCleanerTeamViaWGE(
  teamId: string
): Promise<string[]> {
  // Paso 1: Obtener WorkGroupExecutors ACTIVE para este teamId
  const executors = await prisma.workGroupExecutor.findMany({
    where: {
      teamId,
      status: "ACTIVE",
    },
    select: {
      workGroupId: true,
      hostTenantId: true,
    },
  });

  if (executors.length === 0) {
    return [];
  }

  // Paso 2: Agrupar por hostTenantId y obtener workGroupIds únicos
  const workGroupIdsByTenant = new Map<string, Set<string>>();
  for (const executor of executors) {
    if (!workGroupIdsByTenant.has(executor.hostTenantId)) {
      workGroupIdsByTenant.set(executor.hostTenantId, new Set());
    }
    workGroupIdsByTenant.get(executor.hostTenantId)!.add(executor.workGroupId);
  }

  // Paso 3: Para cada tenant, obtener propiedades asignadas a esos WorkGroups (solo activas)
  // Filtrar por WorkGroupExecutor.status = "ACTIVE" AND HostWorkGroup.status = "ACTIVE"
  const allPropertyIds = new Set<string>();
  
  for (const [hostTenantId, workGroupIds] of workGroupIdsByTenant.entries()) {
    // Primero verificar que los WorkGroups están ACTIVE
    // Filtrar por WorkGroupExecutor.status = "ACTIVE" AND HostWorkGroup.status = "ACTIVE"
    const activeWorkGroups = await (prisma as any).hostWorkGroup.findMany({
      where: {
        id: { in: Array.from(workGroupIds) },
        tenantId: hostTenantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    const activeWorkGroupsTyped = activeWorkGroups as Array<{ id: string }>;
    const activeWorkGroupIds = new Set(activeWorkGroupsTyped.map((wg: { id: string }) => wg.id));

    if (activeWorkGroupIds.size === 0) {
      continue;
    }

    const activeWorkGroupIdsArray = Array.from(activeWorkGroupIds) as unknown as string[];
    const properties = await prisma.hostWorkGroupProperty.findMany({
      where: {
        tenantId: hostTenantId,
        workGroupId: { in: activeWorkGroupIdsArray },
        property: {
          isActive: true, // Solo propiedades activas
        },
      },
      select: {
        propertyId: true,
      },
    });

    for (const prop of properties) {
      allPropertyIds.add(prop.propertyId);
    }
  }

  return Array.from(allPropertyIds);
}

/**
 * Obtiene los propertyIds accesibles por múltiples teamIds vía WorkGroupExecutor.
 * Útil cuando un cleaner tiene múltiples teams.
 */
export async function getPropertiesForCleanerTeamsViaWGE(
  teamIds: string[]
): Promise<string[]> {
  if (teamIds.length === 0) {
    return [];
  }

  const executors = await prisma.workGroupExecutor.findMany({
    where: {
      teamId: { in: teamIds },
      status: "ACTIVE",
    },
    select: {
      workGroupId: true,
      hostTenantId: true,
    },
  });

  if (executors.length === 0) {
    return [];
  }

  const workGroupIdsByTenant = new Map<string, Set<string>>();
  for (const executor of executors) {
    if (!workGroupIdsByTenant.has(executor.hostTenantId)) {
      workGroupIdsByTenant.set(executor.hostTenantId, new Set());
    }
    workGroupIdsByTenant.get(executor.hostTenantId)!.add(executor.workGroupId);
  }

  const allPropertyIds = new Set<string>();
  
  for (const [hostTenantId, workGroupIds] of workGroupIdsByTenant.entries()) {
    // Primero verificar que los WorkGroups están ACTIVE
    // Filtrar por WorkGroupExecutor.status = "ACTIVE" AND HostWorkGroup.status = "ACTIVE"
    const activeWorkGroups = await (prisma as any).hostWorkGroup.findMany({
      where: {
        id: { in: Array.from(workGroupIds) },
        tenantId: hostTenantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    const activeWorkGroupsTyped = activeWorkGroups as Array<{ id: string }>;
    const activeWorkGroupIds = new Set(activeWorkGroupsTyped.map((wg: { id: string }) => wg.id));

    if (activeWorkGroupIds.size === 0) {
      continue;
    }

    const activeWorkGroupIdsArray = Array.from(activeWorkGroupIds) as unknown as string[];
    const properties = await prisma.hostWorkGroupProperty.findMany({
      where: {
        tenantId: hostTenantId,
        workGroupId: { in: activeWorkGroupIdsArray },
        property: {
          isActive: true, // Solo propiedades activas
        },
      },
      select: {
        propertyId: true,
      },
    });

    for (const prop of properties) {
      allPropertyIds.add(prop.propertyId);
    }
  }

  return Array.from(allPropertyIds);
}

