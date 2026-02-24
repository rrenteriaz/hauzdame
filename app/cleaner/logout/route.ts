// app/cleaner/logout/route.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth/session";

const CLEANER_MEMBER_COOKIE = "hd_cleaner_member_id";

/**
 * POST /cleaner/logout
 * Cerrar sesión de cleaner (limpiar cookies de cleaner y user si existen)
 */
export async function POST() {
  const cookieStore = await cookies();
  
  // Limpiar cookie de cleaner (legacy)
  cookieStore.delete(CLEANER_MEMBER_COOKIE);
  
  // Limpiar sesión de user si existe (para evitar "both")
  try {
    await destroySession();
  } catch (error) {
    // Si no hay sesión, no es error
    console.warn("[Cleaner logout] No session to destroy:", error);
  }
  
  redirect("/cleaner/select");
}

