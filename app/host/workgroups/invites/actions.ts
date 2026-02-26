// app/host/workgroups/invites/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { requireHostUser } from "@/lib/auth/requireUser";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";

function redirectBack(formData: FormData) {
  const returnTo = formData.get("returnTo")?.toString();
  if (returnTo && returnTo.startsWith("/host/workgroups")) {
    redirect(returnTo);
  }
  redirect("/host/workgroups");
}

/**
 * Crea una invitación para conectar un Team Leader (Cleaner) a un WorkGroup.
 */
export async function createCleanerInviteForWorkGroup(formData: FormData) {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) {
    redirectBack(formData);
    return;
  }

  const workGroupId = String(formData.get("workGroupId") || "");
  const prefillName = formData.get("prefillName")?.toString().trim() || null;
  const expiresInDaysRaw = formData.get("expiresInDays")?.toString();
  const expiresInDays = Math.max(1, Math.min(30, Number.parseInt(expiresInDaysRaw || "7") || 7));

  if (!workGroupId) {
    redirectBack(formData);
    return;
  }

  // Verificar que el WorkGroup existe y pertenece al tenant
  const workGroup = await prisma.hostWorkGroup.findFirst({
    where: {
      id: workGroupId,
      tenantId: tenantId,
    },
    select: { id: true },
  });

  if (!workGroup) {
    throw new Error("Grupo de trabajo no encontrado.");
  }

  // Generar token único (igual que TL→SM: base64url)
  let token: string;
  let attempts = 0;
  const maxAttempts = 5;
  
  // Verificar que el modelo está disponible (por si Prisma Client aún no se ha regenerado)
  if (!(prisma as any).hostWorkGroupInvite) {
    throw new Error("El modelo HostWorkGroupInvite no está disponible. Por favor, regenera Prisma Client y reinicia el servidor.");
  }

  do {
    token = randomBytes(32).toString("base64url");
    const existing = await (prisma as any).hostWorkGroupInvite.findUnique({
      where: { token },
    });
    if (!existing) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    throw new Error("Error al generar token único. Intenta nuevamente.");
  }

  // Calcular fecha de expiración (igual que TL→SM)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await (prisma as any).hostWorkGroupInvite.create({
    data: {
      tenantId: tenantId,
      workGroupId,
      token,
      status: "PENDING",
      prefillName: prefillName ?? undefined,
      message: null, // No se usa mensaje personalizado (igual que TL→SM)
      createdByUserId: user.id,
      expiresAt,
    },
  });

  revalidatePath("/host/workgroups");
  revalidatePath(`/host/workgroups/${workGroupId}`);
  redirectBack(formData);
}

/**
 * Revoca una invitación (marca como REVOKED).
 */
export async function revokeInvite(formData: FormData) {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) {
    redirectBack(formData);
    return;
  }

  const inviteId = String(formData.get("inviteId") || "");
  if (!inviteId) {
    redirectBack(formData);
    return;
  }

  // Solo revocar si está PENDING
  // Verificar que el modelo está disponible
  if (!(prisma as any).hostWorkGroupInvite) {
    throw new Error("El modelo HostWorkGroupInvite no está disponible. Por favor, regenera Prisma Client y reinicia el servidor.");
  }

  await (prisma as any).hostWorkGroupInvite.updateMany({
    where: {
      id: inviteId,
      tenantId: tenantId,
      status: "PENDING",
    },
    data: {
      status: "REVOKED",
    },
  });

  const workGroupId = formData.get("workGroupId")?.toString();
  revalidatePath("/host/workgroups");
  if (workGroupId) {
    revalidatePath(`/host/workgroups/${workGroupId}`);
  }
  redirectBack(formData);
}

