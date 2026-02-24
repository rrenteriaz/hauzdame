// app/api/chat/threads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { listThreadsForUser } from "@/lib/chat/auth";

/**
 * GET /api/chat/threads
 * Obtener inbox (lista de threads accesibles para el usuario)
 * REGLA DE ORO: Solo threads donde el usuario ES participante activo.
 * NO se filtra por tenantId ni propertyId. Solo por participant.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    // Usar helper centralizado que lista threads por participant
    const threads = await listThreadsForUser(user.id);

    return NextResponse.json({ threads });
  } catch (error: any) {
    console.error("Error obteniendo threads:", error);
    return NextResponse.json(
      { error: error.message || "Error obteniendo mensajes" },
      { status: 500 }
    );
  }
}

