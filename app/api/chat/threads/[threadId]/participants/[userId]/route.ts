// app/api/chat/threads/[threadId]/participants/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canManageThreadMembers } from "@/lib/authz/teamMembership";
import { removeThreadParticipant } from "@/lib/chat/auth";

/**
 * DELETE /api/chat/threads/[threadId]/participants/[userId]
 * Remover un participante de un thread
 * Requiere: TeamMembership ACTIVE + ChatParticipant OWNER/ADMIN
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string; userId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { threadId, userId } = resolvedParams;

    // Validar acceso y permisos para administrar miembros
    const { user } = await canManageThreadMembers(threadId);

    // removeThreadParticipant valida permisos, thread type, y que el target sea participante activo
    await removeThreadParticipant(threadId, user.id, userId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[DELETE /api/chat/threads/[threadId]/participants/[userId]]", error);
    return NextResponse.json(
      { error: error.message || "Error removiendo participante" },
      { status: error.status || 500 }
    );
  }
}
