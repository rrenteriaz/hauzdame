// app/api/chat/threads/[threadId]/participants/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canManageThreadMembers } from "@/lib/authz/teamMembership";
import { addThreadParticipant } from "@/lib/chat/auth";

/**
 * POST /api/chat/threads/[threadId]/participants
 * Agregar un participante a un thread
 * Requiere: TeamMembership ACTIVE + ChatParticipant OWNER/ADMIN
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const resolvedParams = await params;
    const threadId = resolvedParams.threadId;

    // Validar acceso y permisos para administrar miembros
    const { user } = await canManageThreadMembers(threadId);

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId es requerido" },
        { status: 400 }
      );
    }

    // addThreadParticipant valida permisos, thread type, y membership
    await addThreadParticipant(threadId, user.id, userId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[POST /api/chat/threads/[threadId]/participants]", error);
    return NextResponse.json(
      { error: error.message || "Error agregando participante" },
      { status: error.status || 500 }
    );
  }
}
