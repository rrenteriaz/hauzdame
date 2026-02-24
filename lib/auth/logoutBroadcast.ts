// lib/auth/logoutBroadcast.ts
"use client";

/**
 * Canal de broadcast para sincronizar logout entre pestañas
 */
export const AUTH_BROADCAST_CHANNEL = "hausdame-auth";

/**
 * Emite señal de logout a todas las pestañas del mismo navegador
 * Usa BroadcastChannel (preferido) y localStorage (fallback)
 */
export function broadcastLogout(): void {
  const timestamp = Date.now();

  // Intentar BroadcastChannel (más rápido, no dispara storage event en la misma pestaña)
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
      channel.postMessage({
        type: "LOGOUT",
        ts: timestamp,
      });
      channel.close();
    }
  } catch (error) {
    // BroadcastChannel no disponible (Safari antiguo, etc.)
    // Continuar con localStorage fallback
  }

  // Siempre usar localStorage como fallback (funciona en todos los navegadores)
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("hausdame:logout", String(timestamp));
      // Remover inmediatamente para que el evento storage se dispare en otras pestañas
      // (el evento storage solo se dispara cuando el valor cambia)
      setTimeout(() => {
        localStorage.removeItem("hausdame:logout");
      }, 100);
    }
  } catch (error) {
    // localStorage no disponible (modo privado, etc.)
    // No hacer nada, el logout seguirá funcionando en la pestaña actual
  }
}

/**
 * Adjunta listener para detectar logout desde otras pestañas
 * Retorna función de cleanup
 */
export function attachLogoutListener(onLogout: () => void): () => void {
  const cleanup: Array<() => void> = [];

  // Listener para BroadcastChannel
  let channel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
      const handler = (e: MessageEvent) => {
        if (e.data?.type === "LOGOUT") {
          onLogout();
        }
      };
      channel.addEventListener("message", handler);
      cleanup.push(() => {
        channel?.removeEventListener("message", handler);
        channel?.close();
      });
    }
  } catch (error) {
    // BroadcastChannel no disponible, usar solo localStorage
  }

  // Listener para localStorage (storage event)
  if (typeof window !== "undefined") {
    const storageHandler = (e: StorageEvent) => {
      // Solo procesar eventos de otras pestañas (no de la misma)
      if (e.key === "hausdame:logout" && e.newValue) {
        onLogout();
      }
    };
    window.addEventListener("storage", storageHandler);
    cleanup.push(() => {
      window.removeEventListener("storage", storageHandler);
    });
  }

  // Retornar función de cleanup
  return () => {
    cleanup.forEach((fn) => fn());
  };
}

