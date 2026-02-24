import prisma from "@/lib/prisma";
import { ensurePropertyUserAccess } from "@/lib/propertyAccess/ensurePropertyAccess";

const HOST_ROLES = ["OWNER", "ADMIN", "MANAGER", "AUXILIAR"] as const;

export async function claimPropertyInvite(token: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, tenantId: true },
  });
  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const invite = await prisma.propertyInvite.findUnique({
    where: { token },
    include: {
      Property: {
        select: { id: true, tenantId: true, name: true },
      },
    },
  });

  if (!invite) {
    throw new Error("Invitación no encontrada");
  }
  if (!invite.Property) {
    throw new Error("Propiedad no encontrada");
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const currentInvite = await tx.propertyInvite.findUnique({
      where: { id: invite.id },
      select: {
        status: true,
        claimedByUserId: true,
        expiresAt: true,
        role: true,
        tenantId: true,
        propertyId: true,
      },
    });

    if (!currentInvite) {
      throw new Error("Invitación no encontrada");
    }

    if (currentInvite.status === "PENDING" && currentInvite.expiresAt < now) {
      await tx.propertyInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      throw new Error("Esta invitación ha expirado");
    }

    if (currentInvite.status !== "PENDING") {
      if (currentInvite.status === "CLAIMED") {
        if (currentInvite.claimedByUserId === userId) {
          await ensurePropertyUserAccess({
            propertyId: currentInvite.propertyId,
            userId,
            accessRole: currentInvite.role,
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

    if (currentInvite.role === "CLEANER") {
      if (user.role !== "CLEANER") {
        throw new Error("Solo cleaners pueden reclamar esta invitación");
      }
    } else {
      if (!HOST_ROLES.includes(user.role as (typeof HOST_ROLES)[number])) {
        throw new Error("Solo hosts pueden reclamar esta invitación");
      }
      if (user.tenantId !== currentInvite.tenantId) {
        throw new Error("No tienes permiso para esta propiedad");
      }
    }

    const updated = await tx.propertyInvite.updateMany({
      where: { id: invite.id, status: "PENDING" },
      data: {
        status: "CLAIMED",
        claimedAt: now,
        claimedByUserId: userId,
      },
    });

    if (updated.count === 0) {
      const latestInvite = await tx.propertyInvite.findUnique({
        where: { id: invite.id },
        select: { status: true, claimedByUserId: true },
      });
      if (!latestInvite) {
        throw new Error("Invitación no encontrada");
      }
      if (latestInvite.status === "CLAIMED") {
        if (latestInvite.claimedByUserId === userId) {
          await ensurePropertyUserAccess({
            propertyId: currentInvite.propertyId,
            userId,
            accessRole: currentInvite.role,
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

    await ensurePropertyUserAccess({
      propertyId: currentInvite.propertyId,
      userId,
      accessRole: currentInvite.role,
      status: "ACTIVE",
      db: tx,
    });

    return {};
  });

  return {
    success: true,
    propertyId: invite.propertyId,
    redirectTo: user.role === "CLEANER" ? "/cleaner" : "/host",
    message: result.message,
  };
}

