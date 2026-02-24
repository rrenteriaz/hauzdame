// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE_NAME_EXPORT } from "@/lib/auth/session";

const CLEANER_MEMBER_COOKIE = "hd_cleaner_member_id";

/**
 * POST /api/auth/logout
 * Cerrar sesión y limpiar TODAS las cookies de autenticación
 * Afecta a todas las pestañas del dispositivo
 */
export async function POST(req: NextRequest) {
  // Crear respuesta base (siempre JSON válido)
  const response = NextResponse.json({ success: true });
  
  try {
    // Destruir sesión de usuario (puede fallar si no hay sesión, pero no importa)
    try {
      await destroySession();
    } catch (sessionError) {
      // Si falla destroySession, continuar igual (las cookies se eliminan abajo)
      console.warn("[Logout] Error destruyendo sesión:", sessionError);
    }
    
    // Limpiar TODAS las cookies de autenticación (host y cleaner)
    // Usar delete con opciones explícitas para asegurar eliminación
    response.cookies.set(SESSION_COOKIE_NAME_EXPORT, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    
    response.cookies.set(CLEANER_MEMBER_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    
    // También eliminar por nombre (por si acaso)
    response.cookies.delete(SESSION_COOKIE_NAME_EXPORT);
    response.cookies.delete(CLEANER_MEMBER_COOKIE);
    
    return response;
  } catch (error: any) {
    // Si hay un error inesperado, aún así devolver JSON válido y limpiar cookies
    console.error("[Logout] Error inesperado:", error);
    
    // Limpiar cookies incluso si hay error
    response.cookies.set(SESSION_COOKIE_NAME_EXPORT, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    response.cookies.set(CLEANER_MEMBER_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    response.cookies.delete(SESSION_COOKIE_NAME_EXPORT);
    response.cookies.delete(CLEANER_MEMBER_COOKIE);
    
    // Devolver error en JSON válido
    return NextResponse.json(
      { success: false, error: error.message || "Error cerrando sesión" },
      { status: 500 }
    );
  }
}

