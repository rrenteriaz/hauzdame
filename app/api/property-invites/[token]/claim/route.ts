import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { claimPropertyInvite } from "@/lib/invites/claimPropertyInvite";

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

    const { token } = await params;

    try {
      const result = await claimPropertyInvite(token, user.id);
      return NextResponse.json({
        ok: true,
        propertyId: result.propertyId,
        redirectTo: result.redirectTo,
        message: result.message,
      });
    } catch (claimError: any) {
      if (claimError.message.includes("ya fue reclamada por otro usuario")) {
        return NextResponse.json({ error: claimError.message }, { status: 409 });
      }
      if (
        claimError.message.includes("revocada") ||
        claimError.message.includes("expirado")
      ) {
        return NextResponse.json({ error: claimError.message }, { status: 410 });
      }
      if (
        claimError.message.includes("No tienes permiso") ||
        claimError.message.includes("Solo cleaners") ||
        claimError.message.includes("Solo hosts")
      ) {
        return NextResponse.json({ error: claimError.message }, { status: 403 });
      }
      if (claimError.message.includes("rol de acceso")) {
        return NextResponse.json({ error: claimError.message }, { status: 409 });
      }
      if (claimError.message.includes("no encontrada") || claimError.message.includes("no encontrado")) {
        return NextResponse.json({ error: claimError.message }, { status: 404 });
      }
      throw claimError;
    }
  } catch (error: any) {
    console.error("Error reclamando property invite:", error);
    return NextResponse.json(
      { error: error.message || "Error al reclamar invitación" },
      { status: error.status || 500 }
    );
  }
}

