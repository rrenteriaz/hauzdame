// app/host/account/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Page from "@/lib/ui/Page";
import { broadcastLogout } from "@/lib/auth/logoutBroadcast";
import { safeReturnTo } from "@/lib/navigation/safeReturnTo";

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Validar returnTo y usar fallback seguro
  const returnTo = safeReturnTo(searchParams?.get("returnTo") || undefined, "/host/menu");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // Validar que la respuesta sea JSON válido antes de parsear
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // Si no es JSON, considerar logout exitoso (cookies ya fueron eliminadas)
        broadcastLogout();
        router.replace("/login");
        return;
      }

      // Intentar parsear JSON solo si el content-type es correcto
      let data: any = {};
      try {
        const text = await res.text();
        if (text.trim()) {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        // Si falla el parse, considerar logout exitoso (cookies ya fueron eliminadas)
        console.warn("[Logout] Error parseando respuesta:", parseError);
        broadcastLogout();
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Error cerrando sesión");
        setIsLoggingOut(false);
        return;
      }

      // Logout exitoso: emitir señal a otras pestañas y redirigir
      broadcastLogout();
      router.replace("/login");
    } catch (err) {
      console.error("[Logout] Error:", err);
      setError("Error de conexión");
      setIsLoggingOut(false);
    }
  };

  return (
    <Page title="Perfil" showBack backHref={returnTo}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">
              Cuenta
            </h2>
            <p className="text-sm text-neutral-600">
              Gestiona tu perfil y configuración de cuenta.
            </p>
          </div>
        </div>

        {/* Cerrar sesión */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full text-left text-base text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
          {error && (
            <p className="text-xs text-red-600 mt-2">{error}</p>
          )}
        </div>
      </div>
    </Page>
  );
}

