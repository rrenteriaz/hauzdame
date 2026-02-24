// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getSessionUserId } from "@/lib/auth/session";
import { getCurrentMember, getCurrentMemberId } from "@/lib/cleaner-auth";
import { getDefaultTenant } from "@/lib/tenant";
import { cookies } from "next/headers";
import { CHAT_DEBUG } from "@/lib/utils/chatDebug";

/**
 * GET /api/me
 * Endpoint de diagnóstico para verificar autenticación en contexto Host vs Cleaner
 * Siempre retorna 200 con información de diagnóstico (nunca 401/404)
 */
export async function GET(req: NextRequest) {
  try {
    const now = new Date().toISOString();
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Detectar cookies presentes (solo nombres, NO valores)
    const cookiesPresent = allCookies.map(c => c.name);
    
    // Headers disponibles (sin secretos)
    const headersHint: Record<string, string> = {};
    const userAgent = req.headers.get("user-agent");
    const referer = req.headers.get("referer");
    if (userAgent) headersHint.userAgent = userAgent;
    if (referer) headersHint.referer = referer;
    
    // Intentar detectar User auth (no lanzar error si falla)
    let userAuth: any = null;
    let userError: any = null;
    try {
      const user = await getCurrentUser();
      if (user) {
        userAuth = {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          name: user.name,
        };
      }
    } catch (error: any) {
      userError = {
        source: "getCurrentUser",
        message: error?.message || "Unknown error",
        ...(CHAT_DEBUG ? { stack: error?.stack } : {}),
      };
    }
    
    // LEGACY RETIRADO: Ya no se usa TeamMember auth basado en cookie legacy
    // MODERNO: Los cleaners ahora usan sesión + TeamMembership para autenticación
    const teamMemberAuth: any = null;
    const teamMemberError: any = null;
    // getCurrentMember/getCurrentMemberId siempre retornan null ahora (legacy retirado)
    // No intentar obtener TeamMember legacy
    
    // Determinar modo de auth detectado
    const authModeDetected: "user" | "teamMember" | "both" | "none" | "unknown" =
      userAuth && teamMemberAuth ? "both" : userAuth ? "user" : teamMemberAuth ? "teamMember" : "none";
    
    // Recolectar errores (si los hay)
    const errors: Array<{ source: string; message: string }> = [];
    if (userError) errors.push(userError);
    if (teamMemberError) errors.push(teamMemberError);
    
    // Respuesta de diagnóstico
    const response = {
      ok: true,
      path: "/api/me",
      now,
      authModeDetected,
      user: userAuth,
      teamMember: teamMemberAuth,
      cookiesPresent,
      headersHint,
      ...(errors.length > 0 ? { errors } : {}),
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    // Si algo falla críticamente, aún así retornar JSON con error
    console.error("[API /me] Error crítico:", error);
    return NextResponse.json(
      {
        ok: false,
        path: "/api/me",
        now: new Date().toISOString(),
        authModeDetected: "unknown",
        error: {
          message: error?.message || "Unknown error",
          ...(CHAT_DEBUG ? { stack: error?.stack } : {}),
        },
      },
      { status: 200 } // Siempre 200 para diagnóstico
    );
  }
}

