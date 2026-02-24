// app/api/invites/[token]/claim/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { claimInvite } from "@/lib/invites/claimInvite";

/**
 * POST /api/invites/[token]/claim
 * Reclama una invitación (requiere sesión)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Debes iniciar sesión para reclamar esta invitación" },
        { status: 401 }
      );
    }
    if (user.role !== "CLEANER") {
      return NextResponse.json(
        { ok: false, error: "Solo cleaners pueden reclamar invitaciones de equipo" },
        { status: 403 }
      );
    }

    const { token } = await params;

    try {
      const result = await claimInvite(token, user.id);
      return NextResponse.json({
        ok: true,
        teamId: result.teamId,
        redirectTo: result.redirectTo,
        message: result.message,
      });
    } catch (claimError: any) {
      // Mapear errores a códigos HTTP apropiados
      if (claimError.message.includes("ya fue reclamada por otro usuario")) {
        return NextResponse.json(
          { error: claimError.message },
          { status: 409 }
        );
      }

      if (claimError.message.includes("revocada") || claimError.message.includes("expirado")) {
        return NextResponse.json(
          { error: claimError.message },
          { status: 410 }
        );
      }

      if (claimError.message.includes("Tenant no permitido")) {
        return NextResponse.json(
          { error: claimError.message },
          { status: 403 }
        );
      }

      if (claimError.message.includes("Solo cleaners")) {
        return NextResponse.json(
          { error: claimError.message },
          { status: 403 }
        );
      }

      if (claimError.message.includes("no encontrada") || claimError.message.includes("no encontrado")) {
        return NextResponse.json(
          { error: claimError.message },
          { status: 404 }
        );
      }

      throw claimError;
    }
  } catch (error: any) {
    console.error("Error reclamando invite:", error);

    // Manejar errores de unique constraint
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Ya eres miembro de este equipo" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Error al reclamar invitación" },
      { status: error.status || 500 }
    );
  }
}

