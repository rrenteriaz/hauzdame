// lib/utils/chatDebug.ts
/**
 * Flag central de debug para el chat
 * Controla toda la UI de debug, logs detallados y listeners globales
 */

import { dbg } from "@/lib/debug/persistLog";

/**
 * Función para verificar si el debug está activo
 * Soporta múltiples formas de activación:
 * - Query param ?debug=1 en la URL
 * - Variable de entorno NEXT_PUBLIC_CHAT_DEBUG=1
 * - localStorage "CHAT_DEBUG" = "1" (legacy, para compatibilidad)
 * 
 * Por defecto está DESACTIVADO (también en desarrollo).
 * 
 * NOTA: En el cliente, esta función debe llamarse dinámicamente porque
 * el query param puede cambiar sin recargar la página.
 */
export function getChatDebug(): boolean {
  // Verificar variable de entorno (siempre disponible, tanto en servidor como cliente)
  if (process.env.NEXT_PUBLIC_CHAT_DEBUG === "1") {
    return true;
  }

  // Verificar en el cliente (query param o localStorage)
  if (typeof window !== "undefined") {
    // Verificar query param ?debug=1
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("debug") === "1") {
      return true;
    }

    // Verificar localStorage (legacy, para compatibilidad)
    if (window.localStorage?.getItem("CHAT_DEBUG") === "1") {
      return true;
    }
  }

  return false;
}

/**
 * Flag de debug activo (se evalúa una vez por módulo en SSR)
 * En componentes cliente que necesiten reactividad, usar useChatDebug() hook
 */
export const CHAT_DEBUG = typeof window === "undefined" 
  ? process.env.NEXT_PUBLIC_CHAT_DEBUG === "1"
  : getChatDebug();

/**
 * Debug logging condicional
 * Solo loguea si CHAT_DEBUG está activo
 */
export function chatDbg(...args: any[]): void {
  if (!CHAT_DEBUG) {
    return;
  }
  dbg(...args);
}

