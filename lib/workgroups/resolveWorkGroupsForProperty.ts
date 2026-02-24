import prisma from "@/lib/prisma";

export type WorkGroupExecutorRef = {
  workGroupId: string;
  servicesTenantId: string;
  teamId: string;
  status: "ACTIVE" | "INACTIVE";
};

export async function getHostWorkGroupsForProperty(
  hostTenantId: string,
  propertyId: string
) {
  const links = await prisma.hostWorkGroupProperty.findMany({
    where: {
      tenantId: hostTenantId,
      propertyId,
    },
    select: {
      workGroupId: true,
    },
  });

  const workGroupIds = Array.from(new Set(links.map((link) => link.workGroupId)));
  if (workGroupIds.length === 0) {
    return [];
  }

  return prisma.hostWorkGroup.findMany({
    where: {
      tenantId: hostTenantId,
      id: { in: workGroupIds },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Obtiene ejecutores para UI (sin filtrar por status, retorna todos con su status)
 * Útil para mostrar ejecutores en la interfaz del Host
 */
export async function getExecutorsForWorkGroupsForUi(
  hostTenantId: string,
  workGroupIds: string[]
): Promise<WorkGroupExecutorRef[]> {
  if (workGroupIds.length === 0) {
    return [];
  }

  const executors = await prisma.workGroupExecutor.findMany({
    where: {
      hostTenantId,
      workGroupId: { in: workGroupIds },
    },
    select: {
      workGroupId: true,
      servicesTenantId: true,
      teamId: true,
      status: true,
    },
    orderBy: [{ workGroupId: "asc" }, { teamId: "asc" }],
  });

  return executors;
}

/**
 * Obtiene solo ejecutores ACTIVE (filtra por status=ACTIVE)
 * Útil para lógica de acceso y queries de propiedades
 */
export async function getActiveExecutorsForWorkGroups(
  hostTenantId: string,
  workGroupIds: string[]
): Promise<WorkGroupExecutorRef[]> {
  if (workGroupIds.length === 0) {
    return [];
  }

  const executors = await prisma.workGroupExecutor.findMany({
    where: {
      hostTenantId,
      workGroupId: { in: workGroupIds },
      status: "ACTIVE",
    },
    select: {
      workGroupId: true,
      servicesTenantId: true,
      teamId: true,
      status: true,
    },
    orderBy: [{ workGroupId: "asc" }, { teamId: "asc" }],
  });

  return executors;
}

/**
 * @deprecated Usar getExecutorsForWorkGroupsForUi() o getActiveExecutorsForWorkGroups() según el caso
 * Mantenido para compatibilidad
 */
export async function getExecutorsForWorkGroups(
  hostTenantId: string,
  workGroupIds: string[]
): Promise<WorkGroupExecutorRef[]> {
  // Por defecto, retornar solo ACTIVE para mantener comportamiento existente
  return getActiveExecutorsForWorkGroups(hostTenantId, workGroupIds);
}

export async function getServiceTeamsForPropertyViaWorkGroups(
  hostTenantId: string,
  propertyId: string
) {
  const workGroups = await getHostWorkGroupsForProperty(hostTenantId, propertyId);
  const workGroupIds = workGroups.map((wg) => wg.id);
  // Usar solo ejecutores ACTIVE para acceso a propiedades
  const executors = await getActiveExecutorsForWorkGroups(hostTenantId, workGroupIds);
  const teamIds = Array.from(new Set(executors.map((executor) => executor.teamId)));
  return teamIds.sort();
}

