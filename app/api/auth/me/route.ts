// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * GET /api/auth/me
 * Obtener el usuario actual desde la sesión
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Error obteniendo usuario:", error);
    return NextResponse.json(
      { error: error.message || "Error obteniendo usuario" },
      { status: 500 }
    );
  }
}

