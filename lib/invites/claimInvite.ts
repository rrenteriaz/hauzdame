// lib/invites/claimInvite.ts
import prisma from "@/lib/prisma";
import { assertServiceTenantById } from "@/lib/tenants/serviceTenant";
import { ensureTeamMembership } from "@/lib/teams/provisioning";

/**
 * Lógica compartida para reclamar un invite
 * Retorna { success: true, teamId, redirectTo } o lanza error
 */
export async function claimInvite(token: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "CLEANER") {
    throw new Error("Solo cleaners pueden reclamar invitaciones de equipo");
  }

  // Buscar invite por token
  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: {
      Team: {
        select: {
          id: true,
          tenantId: true,
        },
      },
    },
  });

  if (!invite) {
    throw new Error("Invitación no encontrada");
  }

  // Validar team existe
  if (!invite.Team) {
    throw new Error("Team no encontrado");
  }

  const now = new Date();

  // Usar transacción para asegurar consistencia
  const result = await prisma.$transaction(async (tx) => {
    await assertServiceTenantById(invite.Team.tenantId, tx);

    const currentInvite = await tx.teamInvite.findUnique({
      where: { id: invite.id },
      select: { status: true, claimedByUserId: true, expiresAt: true },
    });

    if (!currentInvite) {
      throw new Error("Invitación no encontrada");
    }

    if (currentInvite.status === "PENDING" && currentInvite.expiresAt < now) {
      await tx.teamInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      throw new Error("Esta invitación ha expirado");
    }

    if (currentInvite.status !== "PENDING") {
      if (currentInvite.status === "CLAIMED") {
        if (currentInvite.claimedByUserId === userId) {
          await ensureTeamMembership({
            teamId: invite.teamId,
            userId,
            role: "CLEANER",
            status: "ACTIVE",
            db: tx,
          });
          return { message: "Ya has reclamado esta invitación" };
        }
        throw new Error("Esta invitación ya fue reclamada por otro usuario");
      }
      if (currentInvite.status === "REVOKED") {
        throw new Error("Esta invitación ha sido revocada");
      }
      if (currentInvite.status === "EXPIRED") {
        throw new Error("Esta invitación ha expirado");
      }
    }

    const updated = await tx.teamInvite.updateMany({
      where: { id: invite.id, status: "PENDING" },
      data: {
        status: "CLAIMED",
        claimedAt: now,
        claimedByUserId: userId,
      },
    });

    if (updated.count === 0) {
      const latestInvite = await tx.teamInvite.findUnique({
        where: { id: invite.id },
        select: { status: true, claimedByUserId: true },
      });
      if (!latestInvite) {
        throw new Error("Invitación no encontrada");
      }
      if (latestInvite.status === "CLAIMED") {
        if (latestInvite.claimedByUserId === userId) {
          await ensureTeamMembership({
            teamId: invite.teamId,
            userId,
            role: "CLEANER",
            status: "ACTIVE",
            db: tx,
          });
          return { message: "Ya has reclamado esta invitación" };
        }
        throw new Error("Esta invitación ya fue reclamada por otro usuario");
      }
      if (latestInvite.status === "REVOKED") {
        throw new Error("Esta invitación ha sido revocada");
      }
      if (latestInvite.status === "EXPIRED") {
        throw new Error("Esta invitación ha expirado");
      }
      throw new Error("No se pudo reclamar la invitación");
    }

    await ensureTeamMembership({
      teamId: invite.teamId,
      userId,
      role: "CLEANER",
      status: "ACTIVE",
      db: tx,
    });

    return {};
  });

  return {
    success: true,
    teamId: invite.teamId,
    redirectTo: "/app",
    message: result.message,
  };
}

