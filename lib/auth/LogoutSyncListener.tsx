// lib/auth/LogoutSyncListener.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { attachLogoutListener } from "./logoutBroadcast";

/**
 * Componente que escucha señales de logout desde otras pestañas
 * y redirige automáticamente a /login
 * Se monta en los layouts de Host y Cleaner
 */
export default function LogoutSyncListener() {
  const router = useRouter();

  useEffect(() => {
    const cleanup = attachLogoutListener(() => {
      // Al recibir señal de logout desde otra pestaña:
      // - Redirigir a login (no hacer refresh para evitar errores de JSON parse)
      // - El redirect ya invalida el cache del router
      router.replace("/login");
    });

    return cleanup;
  }, [router]);

  return null;
}

