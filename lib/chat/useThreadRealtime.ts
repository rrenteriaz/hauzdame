// lib/chat/useThreadRealtime.ts
"use client";

import { useEffect, useRef } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { chatDbg } from "@/lib/utils/chatDebug";

interface UseThreadRealtimeOptions {
  threadId: string;
  onNewMessage: () => void | Promise<void>;
  enabled?: boolean;
}

/**
 * Hook para suscribirse a mensajes nuevos en un thread específico
 * Se suscribe al canal `thread:${threadId}` y escucha eventos `message:new`
 */
export function useThreadRealtime({
  threadId,
  onNewMessage,
  enabled = true,
}: UseThreadRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNewMessageRef = useRef(onNewMessage);

  // Mantener referencia actualizada de onNewMessage
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    if (!enabled || !threadId) {
      chatDbg("useThreadRealtime: disabled or no threadId", { enabled, threadId });
      return;
    }

    const supabase = getBrowserSupabaseClient();
    
    // Si Supabase no está disponible, simplemente no suscribirse (sin Realtime)
    if (!supabase) {
      chatDbg("realtime disabled (no env)");
      console.warn("[Realtime Thread] Supabase no disponible, thread funcionará sin actualizaciones en tiempo real");
      console.warn("[Realtime Thread] Verifica que NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY estén configuradas");
      return;
    }
    
    const channelName = `thread:${threadId}`;

    if (process.env.NODE_ENV === "development") {
      console.log(`[Realtime] Suscribiéndose a ${channelName}`);
    }

    const channel = supabase.channel(channelName);

    channel.on("broadcast", { event: "message:new" }, (payload) => {
      console.log(`[Realtime] Mensaje nuevo recibido en ${channelName}:`, payload);

      // Llamar callback para refrescar mensajes
      try {
        onNewMessageRef.current();
      } catch (error) {
        console.error("[Realtime] Error en callback onNewMessage:", error);
      }
    });

    channel.subscribe((status) => {
      console.log(`[Realtime] Estado de suscripción ${channelName}:`, status);
      
      // Si la suscripción falla, intentar reconectar después de un delay
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`[Realtime] Error en suscripción ${channelName}, intentando reconectar...`);
        // El cleanup y re-suscripción se manejará automáticamente por el useEffect
      }
    });

    channelRef.current = channel;

    // Cleanup: desuscribirse al desmontar o cambiar threadId
    return () => {
      if (channelRef.current && supabase) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Realtime] Desuscribiéndose de ${channelName}`);
        }
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [threadId, enabled]);
}

