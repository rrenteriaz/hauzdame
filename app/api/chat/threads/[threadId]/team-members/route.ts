// app/api/chat/threads/[threadId]/team-members/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireThreadAccess } from "@/lib/authz/teamMembership";

/**
 * GET /api/chat/threads/[threadId]/team-members
 * Obtener lista de miembros del team para un thread HOST_TEAM
 * Requiere: TeamMembership ACTIVE + ChatParticipant OWNER (TL)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const resolvedParams = await params;
    const threadId = resolvedParams.threadId;

    // Validar acceso: TeamMembership ACTIVE + ChatParticipant activo
    const { thread, participant } = await requireThreadAccess(threadId);

    // Validar que el thread es HOST_TEAM
    if (thread.type !== "HOST_TEAM") {
      return NextResponse.json(
        { error: "Este endpoint solo está disponible para threads HOST_TEAM" },
        { status: 400 }
      );
    }

    // Validar que el viewer es OWNER (TL)
    if (participant.role !== "OWNER") {
      return NextResponse.json(
        { error: "Solo el Team Leader puede ver los miembros del team" },
        { status: 403 }
      );
    }

    if (!thread.teamId) {
      return NextResponse.json(
        { error: "Thread HOST_TEAM debe tener teamId" },
        { status: 400 }
      );
    }

    // Obtener participants activos del thread para marcar isParticipant
    const threadParticipants = await prisma.chatParticipant.findMany({
      where: {
        threadId,
        leftAt: null,
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarMedia: {
              select: {
                id: true,
                publicUrl: true,
              },
            },
          },
        },
      },
    });

    const participantUserIds = new Set(threadParticipants.map((p) => p.userId));

    // Obtener miembros del team usando TeamMembership (reemplaza TeamMember para membership real)
    const teamMemberships = await prisma.teamMembership.findMany({
      where: {
        teamId: thread.teamId,
        status: "ACTIVE",
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            avatarMedia: {
              select: {
                id: true,
                publicUrl: true,
              },
            },
          },
        },
      },
    });

    // Formatear miembros
    const members = teamMemberships.map((membership) => ({
      id: membership.User.id,
      name: membership.User.name,
      avatarMedia: membership.User.avatarMedia,
      isParticipant: participantUserIds.has(membership.userId),
    }));

    return NextResponse.json({ members }, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/chat/threads/[threadId]/team-members]", error);
    return NextResponse.json(
      { error: error.message || "Error obteniendo miembros del team" },
      { status: error.status || 500 }
    );
  }
}
