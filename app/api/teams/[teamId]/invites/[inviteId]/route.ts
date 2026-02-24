/**
 * CONTRACT: docs/contracts/INVITES_V3.md
 * Cambios en este endpoint requieren actualizar el contrato.
 */
// app/api/teams/[teamId]/invites/[inviteId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

const HOST_ROLES = ["OWNER", "ADMIN", "MANAGER", "AUXILIAR"] as const;

async function requireTeamInviteAccess(teamId: string, userId: string, role: string, tenantId: string | null) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, tenantId: true },
  });

  if (!team) {
    throw new Error("Team no encontrado");
  }

  const isHost = HOST_ROLES.includes(role as (typeof HOST_ROLES)[number]);
  if (isHost) {
    if (tenantId !== team.tenantId) {
      throw new Error("No tienes permiso para acceder a este team");
    }
    return;
  }

  const membership = await prisma.teamMembership.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
    select: {
      role: true,
      status: true,
    },
  });

  if (!membership || membership.status !== "ACTIVE" || membership.role !== "TEAM_LEADER") {
    throw new Error("No tienes permiso para acceder a este team");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; inviteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { teamId, inviteId } = await params;
    await requireTeamInviteAccess(teamId, user.id, user.role, user.tenantId);

    const invite = await prisma.teamInvite.findFirst({
      where: { id: inviteId, teamId },
      select: { id: true, status: true },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    if (invite.status === "CLAIMED") {
      return NextResponse.json(
        { error: "No puedes revocar una invitación ya aceptada" },
        { status: 400 }
      );
    }

    if (invite.status === "REVOKED") {
      return NextResponse.json({ ok: true });
    }

    if (invite.status === "PENDING") {
      await prisma.teamInvite.update({
        where: { id: invite.id },
        data: { status: "REVOKED" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al revocar invitación" },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; inviteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { teamId, inviteId } = await params;
    await requireTeamInviteAccess(teamId, user.id, user.role, user.tenantId);

    const invite = await prisma.teamInvite.findFirst({
      where: { id: inviteId, teamId },
      select: { id: true, status: true },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    if (invite.status === "PENDING") {
      return NextResponse.json(
        { error: "Primero revoca el enlace" },
        { status: 400 }
      );
    }

    if (invite.status !== "CLAIMED" && invite.status !== "REVOKED") {
      return NextResponse.json(
        { error: "Estado inválido para eliminar" },
        { status: 400 }
      );
    }

    try {
      await prisma.teamInvite.delete({
        where: { id: invite.id },
      });
    } catch (deleteError) {
      if (invite.status === "CLAIMED") {
        await prisma.teamInvite.update({
          where: { id: invite.id },
          data: { status: "REVOKED" },
        });
        return NextResponse.json({ ok: true, fallback: true });
      }
      return NextResponse.json(
        { error: "No se pudo eliminar la invitación revocada" },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al eliminar invitación" },
      { status: error.status || 500 }
    );
  }
}

