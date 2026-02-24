// app/api/teams/[teamId]/invites/[inviteId]/revoke/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireHostUser } from "@/lib/auth/requireUser";

/**
 * POST /api/teams/[teamId]/invites/[inviteId]/revoke
 * Revoca una invitación (cambia status a REVOKED)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; inviteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que el usuario es host
    await requireHostUser();

    const { teamId, inviteId } = await params;

    // Validar que el team existe y pertenece al mismo tenant
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team no encontrado" }, { status: 404 });
    }

    // Validar tenantId
    if (user.tenantId !== team.tenantId) {
      return NextResponse.json(
        { error: "No tienes permiso para revocar invitaciones de este team" },
        { status: 403 }
      );
    }

    // Buscar invite
    const invite = await prisma.teamInvite.findFirst({
      where: {
        id: inviteId,
        teamId,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    // Validar que el status es PENDING
    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { error: "Solo se pueden revocar invitaciones pendientes" },
        { status: 400 }
      );
    }

    // Actualizar status a REVOKED
    await prisma.teamInvite.update({
      where: { id: inviteId },
      data: { status: "REVOKED" },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error revocando invite:", error);
    return NextResponse.json(
      { error: error.message || "Error al revocar invitación" },
      { status: error.status || 500 }
    );
  }
}
