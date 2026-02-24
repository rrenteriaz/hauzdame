// lib/supabase/client.ts
"use client";

import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

/**
 * Obtiene el cliente Supabase para el navegador (singleton)
 * Retorna null si no hay variables de entorno (Realtime no disponible)
 */
export function getBrowserSupabaseClient(): ReturnType<typeof createClient> | null {
  if (browserClient !== null) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Supabase] Variables de entorno no configuradas. Realtime no estará disponible."
      );
    }
    browserClient = null;
    return null;
  }

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    // Configuración adicional para mejorar confiabilidad
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  if (process.env.NODE_ENV === "development") {
    console.log("[Supabase] Cliente inicializado correctamente");
  }

  return browserClient;
}

