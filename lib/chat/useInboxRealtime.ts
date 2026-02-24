// lib/chat/useInboxRealtime.ts
"use client";

import { useEffect, useRef } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseInboxRealtimeOptions {
  threadIds: string[];
  onAnyNewMessage: () => void | Promise<void>;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Hook para suscribirse a mensajes nuevos en múltiples threads (inbox)
 * Se suscribe a todos los threads visibles y usa debounce para evitar spam
 */
export function useInboxRealtime({
  threadIds,
  onAnyNewMessage,
  enabled = true,
  debounceMs = 500,
}: UseInboxRealtimeOptions) {
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const onAnyNewMessageRef = useRef(onAnyNewMessage);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mantener referencia actualizada
  useEffect(() => {
    onAnyNewMessageRef.current = onAnyNewMessage;
  }, [onAnyNewMessage]);

  useEffect(() => {
    if (!enabled || threadIds.length === 0) {
      return;
    }

    const supabase = getBrowserSupabaseClient();
    
    // Si Supabase no está disponible, simplemente no suscribirse (sin Realtime)
    if (!supabase) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Realtime Inbox] Supabase no disponible, inbox funcionará sin actualizaciones en tiempo real");
      }
      return;
    }

    // Función debounced para refrescar inbox
    const debouncedRefresh = () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        onAnyNewMessageRef.current();
      }, debounceMs);
    };

    // Suscribirse a cada thread
    threadIds.forEach((threadId) => {
      // Si ya existe suscripción, no crear otra
      if (channelsRef.current.has(threadId)) {
        return;
      }

      const channelName = `thread:${threadId}`;

      if (process.env.NODE_ENV === "development") {
        console.log(`[Realtime Inbox] Suscribiéndose a ${channelName}`);
      }

      const channel = supabase.channel(channelName);

      channel.on("broadcast", { event: "message:new" }, (payload) => {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Realtime Inbox] Mensaje nuevo en ${channelName}:`, payload);
        }

        // Debounce para evitar múltiples refrescos si llegan varios mensajes
        debouncedRefresh();
      });

      channel.subscribe((status) => {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Realtime Inbox] Estado ${channelName}:`, status);
        }
      });

      channelsRef.current.set(threadId, channel);
    });

    // Cleanup: desuscribirse de todos los channels
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      if (supabase) {
        channelsRef.current.forEach((channel, threadId) => {
          if (process.env.NODE_ENV === "development") {
            console.log(`[Realtime Inbox] Desuscribiéndose de thread:${threadId}`);
          }
          supabase.removeChannel(channel);
        });
      }

      channelsRef.current.clear();
    };
  }, [threadIds.join(","), enabled, debounceMs]); // Usar join para comparar arrays
}

