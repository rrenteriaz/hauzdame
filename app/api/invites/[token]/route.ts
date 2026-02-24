// app/api/invites/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/invites/[token]
 * Obtiene información de una invitación por token (público)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Buscar invite por token
    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: {
        Team: {
          select: {
            id: true,
            name: true,
            tenantId: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    // Verificar si está revocada
    if (invite.status === "REVOKED") {
      return NextResponse.json(
        { error: "Esta invitación ha sido revocada" },
        { status: 410 }
      );
    }

    // Verificar si está expirada
    const now = new Date();
    if (invite.expiresAt < now && invite.status === "PENDING") {
      // Opcionalmente actualizar status a EXPIRED
      await prisma.teamInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });

      return NextResponse.json(
        { error: "Esta invitación ha expirado" },
        { status: 410 }
      );
    }

    const leaderMembership = await prisma.teamMembership.findFirst({
      where: {
        teamId: invite.teamId,
        role: "TEAM_LEADER",
        status: "ACTIVE",
      },
      select: {
        User: { select: { name: true, email: true } },
      },
    });

    const inviterName =
      leaderMembership?.User?.name ||
      leaderMembership?.User?.email ||
      invite.Team.name ||
      "El equipo";

    const teamDisplayName =
      !invite.Team.name || invite.Team.name === "Mi equipo"
        ? `Equipo de ${inviterName}`
        : invite.Team.name;

    // Retornar información mínima para pantalla join
    return NextResponse.json({
      teamId: invite.teamId,
      teamName: invite.Team.name,
      inviterName,
      teamDisplayName,
      tenantId: invite.Team.tenantId,
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
      prefillName: invite.prefillName,
      message: invite.message,
    });
  } catch (error: any) {
    console.error("Error obteniendo invite:", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener invitación" },
      { status: error.status || 500 }
    );
  }
}

