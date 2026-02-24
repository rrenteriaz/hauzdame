// app/host/workgroups/actions-executors.ts
"use server";

import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toggleExecutorStatus } from "@/lib/workgroups/toggleExecutorStatus";

function redirectBack(formData: FormData) {
  const returnTo = formData.get("returnTo")?.toString();
  if (returnTo && returnTo.startsWith("/host/workgroups")) {
    redirect(returnTo);
  }
  redirect("/host/workgroups");
}

/**
 * Agrega un ejecutor existente (Team) a un WorkGroup.
 * Reutiliza un teamId que ya está conectado a otros WorkGroups del mismo Host.
 */
export async function addExecutorToWorkGroup(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    redirectBack(formData);
    return;
  }

  const workGroupId = String(formData.get("workGroupId") || "");
  const teamId = String(formData.get("teamId") || "");

  if (!workGroupId || !teamId) {
    redirectBack(formData);
    return;
  }

  // Verificar que el WorkGroup existe
  const workGroup = await prisma.hostWorkGroup.findFirst({
    where: {
      id: workGroupId,
      tenantId: tenant.id,
    },
    select: { id: true },
  });

  if (!workGroup) {
    throw new Error("Grupo de trabajo no encontrado.");
  }

  // Buscar un WorkGroupExecutor existente para este teamId en el mismo hostTenantId
  // para obtener el servicesTenantId
  const existingExecutor = await prisma.workGroupExecutor.findFirst({
    where: {
      hostTenantId: tenant.id,
      teamId,
      status: "ACTIVE",
    },
    select: {
      servicesTenantId: true,
    },
  });

  if (!existingExecutor) {
    throw new Error("No se encontró información del equipo ejecutor. El equipo debe estar conectado a otro grupo de trabajo primero.");
  }

  // Crear/activar WorkGroupExecutor para este WorkGroup
  await prisma.workGroupExecutor.upsert({
    where: {
      hostTenantId_workGroupId_teamId: {
        hostTenantId: tenant.id,
        workGroupId,
        teamId,
      },
    },
    create: {
      hostTenantId: tenant.id,
      workGroupId,
      servicesTenantId: existingExecutor.servicesTenantId,
      teamId,
      status: "ACTIVE",
    },
    update: {
      status: "ACTIVE",
    },
  });

  revalidatePath("/host/workgroups");
  revalidatePath(`/host/workgroups/${workGroupId}`);
  redirectBack(formData);
}

/**
 * Cambia el status de un WorkGroupExecutor (ACTIVE ↔ INACTIVE).
 * Reutiliza la lógica backend existente en toggleExecutorStatus.
 */
export async function toggleExecutorStatusAction(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("Tenant no encontrado");
  }

  const workGroupId = String(formData.get("workGroupId") || "");
  const teamId = String(formData.get("teamId") || "");
  const newStatus = String(formData.get("newStatus") || "");

  if (!workGroupId || !teamId || (newStatus !== "ACTIVE" && newStatus !== "INACTIVE")) {
    throw new Error("Parámetros inválidos");
  }

  // Verificar que el WorkGroup existe y pertenece al tenant
  const workGroup = await prisma.hostWorkGroup.findFirst({
    where: {
      id: workGroupId,
      tenantId: tenant.id,
    },
    select: { id: true },
  });

  if (!workGroup) {
    throw new Error("Grupo de trabajo no encontrado.");
  }

  // Invocar la función backend existente
  const result = await toggleExecutorStatus({
    hostTenantId: tenant.id,
    workGroupId,
    teamId,
    newStatus: newStatus as "ACTIVE" | "INACTIVE",
  });

  // Revalidar rutas relevantes
  revalidatePath("/host/workgroups");
  revalidatePath(`/host/workgroups/${workGroupId}`);
  revalidatePath(`/host/workgroups/${workGroupId}/teams/${teamId}`);

  return result;
}

