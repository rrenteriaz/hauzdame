// app/host/teams/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

function redirectBack(formData: FormData) {
  const returnTo = formData.get("returnTo")?.toString();
  if (returnTo && returnTo.startsWith("/host/teams")) {
    redirect(returnTo);
  }
  redirect("/host/teams");
}

export async function createTeam(formData: FormData) {
  // GUARDRAIL: Host ya no crea Teams. Debe usar WorkGroups.
  throw new Error("Host ya no crea Teams directamente. Por favor, usa Grupos de Trabajo (WorkGroups) en /host/workgroups");
}

export async function updateTeam(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    redirectBack(formData);
    return;
  }

  const id = String(formData.get("teamId") || "");
  const name = formData.get("name")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim() || null;

  if (!id || !name) {
    redirectBack(formData);
    return;
  }

  try {
    await prisma.team.updateMany({
      where: {
        id,
        tenantId: tenant.id,
      },
      data: {
        name,
        notes: notes ?? undefined,
      },
    });

    revalidatePath("/host/teams");
    revalidatePath(`/host/teams/${id}`);
    redirectBack(formData);
  } catch (error: any) {
    // Manejar error de constraint único (nombre duplicado)
    if (error?.code === "P2002" && error?.meta?.target?.includes("tenantId") && error?.meta?.target?.includes("name")) {
      throw new Error("Ya existe un equipo con ese nombre en este tenant.");
    }
    // Re-lanzar otros errores
    throw error;
  }
}

export async function updateTeamStatus(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    redirectBack(formData);
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    redirectBack(formData);
    return;
  }

  const id = String(formData.get("teamId") || "");
  const status = formData.get("status")?.toString();

  if (!id || (status !== "ACTIVE" && status !== "INACTIVE")) {
    redirectBack(formData);
    return;
  }

  const isInactive = status === "INACTIVE";

  await prisma.team.updateMany({
    where: {
      id,
      tenantId: tenant.id,
    },
    data: {
      status,
      inactivatedAt: isInactive ? new Date() : null,
      inactivatedByUserId: isInactive ? user.id : null,
    },
  });

  revalidatePath("/host/teams");
  revalidatePath(`/host/teams/${id}`);
  redirectBack(formData);
}

export async function updateTeamProperties(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    redirectBack(formData);
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    redirectBack(formData);
    return;
  }

  const allowedRoles = ["OWNER", "MANAGER", "AUXILIAR"];
  if (!allowedRoles.includes(user.role)) {
    throw new Error("No autorizado.");
  }

  const teamId = String(formData.get("teamId") || "");
  const rawPropertyIds = formData.get("propertyIds")?.toString() || "[]";
  let propertyIds: string[] = [];
  try {
    propertyIds = JSON.parse(rawPropertyIds);
  } catch {
    propertyIds = [];
  }

  if (!teamId) {
    throw new Error("Equipo inválido.");
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, tenantId: tenant.id },
    select: { id: true, status: true },
  });

  if (!team) {
    throw new Error("Equipo no encontrado.");
  }

  if (team.status === "INACTIVE" || team.status === "PAUSED") {
    throw new Error("Equipo inactivo.");
  }

  const validProperties = await prisma.property.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      id: { in: propertyIds },
    },
    select: { id: true },
  });
  const validPropertyIds = new Set(validProperties.map((p) => p.id));
  const finalPropertyIds = propertyIds.filter((id) => validPropertyIds.has(id));

  const existing = await (prisma as any).propertyTeam.findMany({
    where: { tenantId: tenant.id, teamId },
    select: { propertyId: true },
  });
  const existingIds = new Set(existing.map((e: any) => e.propertyId));

  const toCreate = finalPropertyIds.filter((id) => !existingIds.has(id));
  const toDelete = existing
    .map((e: any) => e.propertyId)
    .filter((id: string) => !finalPropertyIds.includes(id));

  await prisma.$transaction(async (tx) => {
    if (toDelete.length > 0) {
      await (tx as any).propertyTeam.deleteMany({
        where: {
          tenantId: tenant.id,
          teamId,
          propertyId: { in: toDelete },
        },
      });
    }

    if (toCreate.length > 0) {
      await (tx as any).propertyTeam.createMany({
        data: toCreate.map((propertyId) => ({
          tenantId: tenant.id,
          teamId,
          propertyId,
        })),
      });
    }
  });

  revalidatePath("/host/teams");
  revalidatePath(`/host/teams/${teamId}`);
}

export async function deleteTeam(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    redirectBack(formData);
    return;
  }

  const id = String(formData.get("teamId") || "");
  if (!id) redirectBack(formData);

  // Verificar si algún miembro del equipo tiene limpiezas asignadas
  const membersWithCleanings = await (prisma as any).teamMember.findMany({
    where: {
      teamId: id,
      tenantId: tenant.id,
    },
    include: {
      cleanings: {
        take: 1,
      },
    },
  });

  const hasCleanings = membersWithCleanings.some((member: any) => member.cleanings.length > 0);

  if (hasCleanings) {
    // No se puede eliminar si tiene limpiezas asignadas
    // Redirigir de vuelta con un mensaje de error (podría mejorarse con toast/notificación)
    redirectBack(formData);
    return;
  }

  await (prisma as any).team.deleteMany({
    where: {
      id,
      tenantId: tenant.id,
    },
  });

  revalidatePath("/host/teams");
  redirect("/host/teams");
}

/**
 * Helper para guardar schedules de un miembro.
 * Recibe un array de objetos { dayOfWeek, isWorking, startTime, endTime }
 */
async function saveMemberSchedules(
  tenantId: string,
  memberId: string,
  schedules: Array<{ dayOfWeek: number; isWorking: boolean; startTime: string | null; endTime: string | null }>
) {
  // Eliminar schedules existentes
  await (prisma as any).teamMemberScheduleDay.deleteMany({
    where: {
      tenantId,
      memberId,
    },
  });

  // Crear nuevos schedules
  if (schedules.length > 0) {
    await (prisma as any).teamMemberScheduleDay.createMany({
      data: schedules.map((s) => ({
        tenantId,
        memberId,
        dayOfWeek: s.dayOfWeek,
        isWorking: s.isWorking,
        startTime: s.isWorking ? s.startTime : null,
        endTime: s.isWorking ? s.endTime : null,
      })),
    });
  }
}

export async function createTeamMember(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    redirectBack(formData);
    return;
  }

  const teamId = formData.get("teamId")?.toString();
  const name = formData.get("name")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim() || null;

  if (!teamId || !name) {
    redirectBack(formData);
    return;
  }

  // Crear el miembro primero
  const member = await (prisma as any).teamMember.create({
    data: {
      tenantId: tenant.id,
      teamId,
      name,
      phone: phone ?? undefined,
      isActive: true,
      // Mantener campos antiguos para compatibilidad (se pueden eliminar después de migración completa)
      workingDays: [],
      workingStartTime: null,
      workingEndTime: null,
    },
  });

  // Parsear schedules desde el formulario (siempre se proporcionan)
  const schedules: Array<{ dayOfWeek: number; isWorking: boolean; startTime: string | null; endTime: string | null }> = [];
  
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const isWorking = formData.get(`schedule_${dayOfWeek}_isWorking`)?.toString() === "true";
    const startTime = formData.get(`schedule_${dayOfWeek}_startTime`)?.toString().trim() || null;
    const endTime = formData.get(`schedule_${dayOfWeek}_endTime`)?.toString().trim() || null;

    // Validación: si isWorking=true, startTime y endTime deben ser válidos
    let finalStartTime = startTime;
    let finalEndTime = endTime;

    if (isWorking) {
      // Si no hay horarios, usar defaults
      if (!finalStartTime || !finalEndTime) {
        finalStartTime = "09:00";
        finalEndTime = "18:00";
      }
      // Validar que start < end
      if (finalStartTime >= finalEndTime) {
        console.warn(`[createTeamMember] Día ${dayOfWeek}: hora inicio >= hora fin, usando defaults`);
        finalStartTime = "09:00";
        finalEndTime = "18:00";
      }
    }

    schedules.push({
      dayOfWeek,
      isWorking,
      startTime: isWorking ? finalStartTime : null,
      endTime: isWorking ? finalEndTime : null,
    });
  }

  // Guardar schedules (siempre se guardan)
  await saveMemberSchedules(tenant.id, member.id, schedules);

  const returnTo = formData.get("returnTo")?.toString();
  revalidatePath("/host/teams");
  if (returnTo && returnTo.startsWith("/host/teams")) {
    revalidatePath(returnTo);
    redirect(returnTo);
  }
  redirectBack(formData);
}

export async function updateTeamMember(formData: FormData, skipRedirect: boolean = false) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    if (!skipRedirect) redirectBack(formData);
    return;
  }

  const id = String(formData.get("memberId") || "");
  const name = formData.get("name")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim() || null;

  if (!id || !name) {
    if (!skipRedirect) redirectBack(formData);
    return;
  }

  // Parsear schedules desde el formulario
  const schedules: Array<{ dayOfWeek: number; isWorking: boolean; startTime: string | null; endTime: string | null }> = [];
  
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const isWorking = formData.get(`schedule_${dayOfWeek}_isWorking`)?.toString() === "true";
    const startTime = formData.get(`schedule_${dayOfWeek}_startTime`)?.toString().trim() || null;
    const endTime = formData.get(`schedule_${dayOfWeek}_endTime`)?.toString().trim() || null;

    // Validación: si isWorking=true, startTime y endTime deben ser válidos
    let finalStartTime = startTime;
    let finalEndTime = endTime;

    if (isWorking) {
      // Si no hay horarios, usar defaults
      if (!finalStartTime || !finalEndTime) {
        finalStartTime = "08:00";
        finalEndTime = "18:00";
      }
      // Validar que start < end
      if (finalStartTime >= finalEndTime) {
        console.warn(`[updateTeamMember] Día ${dayOfWeek}: hora inicio >= hora fin, usando defaults`);
        finalStartTime = "08:00";
        finalEndTime = "18:00";
      }
    }

    schedules.push({
      dayOfWeek,
      isWorking,
      startTime: isWorking ? finalStartTime : null,
      endTime: isWorking ? finalEndTime : null,
    });
  }

  // Actualizar el miembro
  await (prisma as any).teamMember.updateMany({
    where: {
      id,
      tenantId: tenant.id,
    },
    data: {
      name,
      phone: phone ?? undefined,
    },
  });

  // Guardar schedules
  await saveMemberSchedules(tenant.id, id, schedules);

  const returnTo = formData.get("returnTo")?.toString();
  revalidatePath("/host/teams");
  if (returnTo && returnTo.startsWith("/host/teams")) {
    revalidatePath(returnTo);
  }

  // Solo hacer redirect si no se especifica skipRedirect
  if (!skipRedirect) {
    if (returnTo && returnTo.startsWith("/host/teams")) {
      redirect(returnTo);
    } else {
      redirectBack(formData);
    }
  }
}

export async function toggleTeamMemberStatus(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    redirectBack(formData);
    return;
  }

  const id = String(formData.get("memberId") || "");
  const isActive = formData.get("isActive")?.toString() === "true";

  if (!id) redirectBack(formData);

  await prisma.teamMember.updateMany({
    where: {
      id,
      tenantId: tenant.id,
    },
    data: {
      isActive,
    },
  });

  const returnTo = formData.get("returnTo")?.toString();
  revalidatePath("/host/teams");
  if (returnTo && returnTo.startsWith("/host/teams")) {
    revalidatePath(returnTo);
    redirect(returnTo);
  }
  redirectBack(formData);
}

export async function deleteTeamMember(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    redirectBack(formData);
    return;
  }

  const id = String(formData.get("memberId") || "");
  if (!id) redirectBack(formData);

  // Verificar si el miembro tiene limpiezas asignadas
  const cleaningsCount = await (prisma as any).cleaning.count({
    where: {
      assignedTeamMemberId: id,
      tenantId: tenant.id,
    },
  });

  if (cleaningsCount > 0) {
    // No se puede eliminar si tiene limpiezas asignadas
    // Redirigir de vuelta con un mensaje de error (podría mejorarse con toast/notificación)
    redirectBack(formData);
    return;
  }

  await (prisma as any).teamMember.deleteMany({
    where: {
      id,
      tenantId: tenant.id,
    },
  });

  const returnTo = formData.get("returnTo")?.toString();
  revalidatePath("/host/teams");
  if (returnTo && returnTo.startsWith("/host/teams")) {
    revalidatePath(returnTo);
    redirect(returnTo);
  }
  redirectBack(formData);
}

