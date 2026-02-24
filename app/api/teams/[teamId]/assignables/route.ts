// app/api/teams/[teamId]/assignables/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireHostUser } from "@/lib/auth/requireUser";
import { forbidden, notFound } from "@/lib/http/errors";

/**
 * GET /api/teams/[teamId]/assignables
 * Lista miembros asignables para una limpieza (TeamMembership + TeamMember legacy)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo hosts pueden listar miembros asignables
    await requireHostUser();

    const resolvedParams = params instanceof Promise ? await params : params;
    const { teamId } = resolvedParams;

    // Obtener el team y validar tenant
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        tenantId: true,
        status: true,
      },
    });

    if (!team) {
      notFound("Equipo no encontrado.");
    }

    if (team.tenantId !== user.tenantId) {
      forbidden("No tienes acceso a este equipo.");
    }

    if (team.status === "PAUSED") {
      forbidden("Equipo no disponible.");
    }

    // Obtener TeamMembership ACTIVE role CLEANER (usuarios nuevos)
    const memberships = await prisma.teamMembership.findMany({
      where: {
        teamId: teamId,
        status: "ACTIVE",
        role: "CLEANER", // Solo cleaners pueden ser asignados
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Obtener TeamMember legacy activos
    const teamMembersLegacy = await prisma.teamMember.findMany({
      where: {
        teamId: teamId,
        tenantId: team.tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      memberships: memberships.map((m) => ({
        id: m.id,
        userId: m.userId,
        user: {
          id: m.User.id,
          name: m.User.name,
          email: m.User.email,
        },
        role: m.role,
        status: m.status,
      })),
      teamMembersLegacy: teamMembersLegacy,
    });
  } catch (error: any) {
    console.error("[GET /api/teams/[teamId]/assignables] Error:", error);
    
    // Si es un error de forbidden/notFound, propagarlo
    if (error.status === 403 || error.status === 404) {
      throw error;
    }
    
    return NextResponse.json(
      { error: "Error al obtener miembros asignables" },
      { status: 500 }
    );
  }
}
