// lib/realtime/chat.ts
/**
 * Utilidades para emitir eventos de Realtime usando Supabase Broadcast
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Emite un evento de nuevo mensaje vía Supabase Realtime Broadcast
 */
export async function emitRealtimeMessage(threadId: string, message: any) {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("[Realtime] Supabase no configurado, omitiendo broadcast");
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Usar channel específico del thread
    const channel = supabase.channel(`thread:${threadId}`, {
      config: {
        broadcast: { self: true },
      },
    });

    // Suscribirse al canal (requerido antes de enviar)
    // Usar un enfoque más resiliente: intentar enviar incluso si la suscripción falla
    let subscribed = false;
    const subscribePromise = new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        // Si no se suscribe en 3 segundos, continuar de todas formas
        console.warn("[Realtime] Timeout en suscripción, intentando enviar de todas formas");
        resolve();
      }, 3000);

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          subscribed = true;
          clearTimeout(timeout);
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // No rechazar, solo loguear y continuar
          console.warn(`[Realtime] Estado de suscripción: ${status}, intentando enviar de todas formas`);
          clearTimeout(timeout);
          resolve();
        }
        // Otros estados (JOINING, etc.) se ignoran y esperan
      });
    });

    // Esperar a que la suscripción esté lista (con timeout)
    await subscribePromise;

    // Enviar broadcast usando httpSend() explícitamente (recomendado para evitar fallback automático)
    const status = await (channel as any).httpSend({
      type: "broadcast",
      event: "message:new",
      payload: {
        threadId,
        messageId: message.id,
        message,
      },
    });

    if (status !== "ok") {
      console.warn(`[Realtime] Broadcast enviado con estado: ${status}`);
    } else {
      console.log(`[Realtime] Broadcast enviado exitosamente a thread:${threadId}`);
    }

    // Desuscribirse después de enviar
    await supabase.removeChannel(channel);
  } catch (error) {
    console.error("[Realtime] Error emitiendo mensaje:", error);
    // No fallar si el broadcast falla - el mensaje ya está guardado en la BD
  }
}

