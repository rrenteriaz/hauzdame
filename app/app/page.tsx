// app/app/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Ruta inteligente que redirige según el role del usuario autenticado
 * - HOST → /host/hoy
 * - CLEANER → /cleaner
 * - Sin sesión → /login
 */
export default async function AppPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Redirigir según role
  if (user.role === "CLEANER") {
    redirect("/cleaner");
  }

  // Roles HOST: OWNER, ADMIN, MANAGER, AUXILIAR
  const hostRoles = ["OWNER", "ADMIN", "MANAGER", "AUXILIAR"];
  if (hostRoles.includes(user.role)) {
    redirect("/host/hoy");
  }

  // Role desconocido → login
  redirect("/login");
}

