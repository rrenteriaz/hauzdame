// lib/authz/teamMembership.ts
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { chatThreadAccessSelect, type ChatThreadAccessPayload } from "@/lib/chat/chatThreadIncludes";

/**
 * Requiere que el usuario esté autenticado
 * Retorna currentUser o lanza 401
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Requiere que el usuario tenga TeamMembership ACTIVE en el team
 * Si roles se proporciona, exige que el role esté en la lista
 * Si falla: lanza error o retorna 403
 */
export async function requireTeamMembership(
  teamId: string,
  options?: {
    roles?: ("OWNER" | "MANAGER" | "AUXILIAR" | "CLEANER" | "HANDYMAN")[];
    allowRemoved?: boolean;
  }
) {
  const user = await requireUser();

  // Verificar que el team existe
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, tenantId: true },
  });

  if (!team) {
    throw new Error("Team no encontrado");
  }

  // Buscar TeamMembership
  const membership = await prisma.teamMembership.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: user.id,
      },
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  // Verificar que existe y está ACTIVE (o REMOVED si allowRemoved)
  if (!membership) {
    throw new Error("No tienes acceso a este equipo");
  }

  if (membership.status !== "ACTIVE") {
    if (!options?.allowRemoved || membership.status !== "REMOVED") {
      throw new Error("No tienes acceso a este equipo");
    }
  }

  // Si se especifican roles, validar (solo para memberships ACTIVE)
  if (options?.roles && options.roles.length > 0 && membership.status === "ACTIVE") {
    if (!options.roles.includes(membership.role as any)) {
      throw new Error("No tienes permisos suficientes para esta acción");
    }
  }

  return {
    user,
    team,
    membership,
  };
}

/**
 * Requiere acceso a un thread:
 * - TeamMembership ACTIVE en el team del thread
 * - ChatParticipant activo del thread
 */
export async function requireThreadAccess(
  threadId: string,
  options?: { allowRemovedMembership?: boolean }
) {
  const user = await requireUser();

  // Cargar thread usando helper tipado (siempre incluye tenantId)
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: chatThreadAccessSelect,
  });

  if (!thread) {
    throw new Error("Thread no encontrado");
  }

  // Si el thread tiene teamId, verificar TeamMembership
  let teamMembership = null;
  if (thread.teamId) {
    teamMembership = await requireTeamMembership(thread.teamId, {
      allowRemoved: options?.allowRemovedMembership,
    });
  }

  // Verificar ChatParticipant
  const participant = await prisma.chatParticipant.findFirst({
    where: {
      threadId,
      userId: user.id,
      leftAt: null,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!participant) {
    throw new Error("No tienes acceso a este hilo de conversación");
  }

  return {
    user,
    thread,
    participant,
    teamMembership,
  };
}

/**
 * Requiere permisos para administrar miembros del thread
 * - requireThreadAccess
 * - ChatParticipant.role debe ser OWNER o ADMIN
 */
export async function canManageThreadMembers(threadId: string) {
  const result = await requireThreadAccess(threadId);

  if (result.participant.role !== "OWNER" && result.participant.role !== "ADMIN") {
    throw new Error("Solo el dueño o administrador del hilo puede administrar miembros");
  }

  return result;
}

