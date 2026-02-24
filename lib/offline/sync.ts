// lib/offline/sync.ts
import { getPendingOutbox, updateAttempt, removeFromOutbox, calculateNextRetry } from "./outbox";
import { markMessageSent, markMessageFailed } from "./chatCache";

let syncInterval: NodeJS.Timeout | null = null;
let isSyncing = false;

/**
 * Sincronizar un batch de mensajes del outbox
 */
export async function syncOutboxOnce(): Promise<number> {
  // Verificar estado de red
  if (typeof window !== "undefined" && !navigator.onLine) {
    return 0;
  }

  if (isSyncing) {
    return 0; // Ya hay un sync en progreso
  }

  try {
    isSyncing = true;
    const now = new Date();
    const pending = await getPendingOutbox(now);

    if (pending.length === 0) {
      return 0;
    }

    let synced = 0;

    for (const item of pending) {
      try {
        // Crear AbortController con timeout de 20 segundos
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          abortController.abort();
        }, 20000); // 20 segundos timeout

        const res = await fetch(`/api/chat/threads/${item.threadId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: item.body,
            clientMessageId: item.clientMessageId,
            clientCreatedAt: item.clientCreatedAt,
            type: "TEXT",
          }),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        // Parsear respuesta de forma robusta
        let data: any;
        const contentType = res.headers.get("content-type");
        
        if (!contentType?.includes("application/json")) {
          // Si no es JSON, leer como texto para logging
          let textError: Error | null = null;
          try {
            const text = await res.text();
            console.error(`[Offline Sync] Respuesta no es JSON para ${item.clientMessageId}:`, text);
            throw new Error(`Respuesta inválida del servidor: ${res.status}`);
          } catch (err: any) {
            textError = err instanceof Error ? err : new Error(String(err));
            throw new Error(`Error parseando respuesta: ${textError.message}`);
          }
        }
        
        try {
          data = await res.json();
        } catch (parseError: any) {
          console.error(`[Offline Sync] Error parseando JSON para ${item.clientMessageId}:`, parseError);
          throw new Error(`Error parseando respuesta JSON: ${parseError.message}`);
        }

        if (res.ok) {
          // Éxito o duplicado: ambos casos son éxito
          if (data.isDuplicate) {
            console.log(`[Offline Sync] Mensaje duplicado detectado (ya existe en servidor): ${item.clientMessageId}`);
          }
          
          // Marcar como enviado y remover de outbox
          await markMessageSent(item.clientMessageId, data.message);
          await removeFromOutbox(item.clientMessageId);
          synced++;

          // Logging controlado: solo en dev
          if (process.env.NODE_ENV === "development") {
            console.log(`[Offline Sync] Message sent: ${item.clientMessageId}${data.isDuplicate ? " (duplicate)" : ""}`);
          }
        } else {
          // Error del servidor: verificar si es un error de constraint único (P2002)
          // que indica que el mensaje ya existe pero la respuesta no fue 200
          if (res.status === 500 && data.error?.includes("Unique constraint")) {
            // El mensaje ya existe en el servidor, intentar obtenerlo
            console.log(`[Offline Sync] Constraint único detectado, mensaje ya existe: ${item.clientMessageId}`);
            
            // Intentar obtener el mensaje existente desde el servidor
            try {
              const getRes = await fetch(`/api/chat/threads/${item.threadId}/messages?limit=100`);
              if (getRes.ok) {
                const getData = await getRes.json();
                const existingMessage = getData.messages?.find(
                  (m: any) => m.clientMessageId === item.clientMessageId
                );
                
                if (existingMessage) {
                  // Encontrado, marcar como enviado
                  await markMessageSent(item.clientMessageId, existingMessage);
                  await removeFromOutbox(item.clientMessageId);
                  synced++;
                  continue;
                }
              }
            } catch (getError) {
              console.warn(`[Offline Sync] Error obteniendo mensaje existente: ${getError}`);
            }
          }
          
          // Error: actualizar intentos
          const newAttempts = item.attempts + 1;

          if (newAttempts > 8) {
            // Demasiados intentos, marcar como fallido
            await markMessageFailed(item.clientMessageId, data.error || `Server error: ${res.status}`);
            await removeFromOutbox(item.clientMessageId);

            console.warn(`[Offline Sync] Message failed after ${newAttempts} attempts: ${item.clientMessageId}`);
          } else {
            // Reintentar con backoff
            const nextRetry = calculateNextRetry(newAttempts);
            await updateAttempt(item.clientMessageId, {
              attempts: newAttempts,
              nextRetryAt: nextRetry,
              lastError: data.error || `Server error: ${res.status}`,
            });

            console.log(`[Offline Sync] Retry scheduled for ${item.clientMessageId} (attempt ${newAttempts})`);
          }
        }
      } catch (error: any) {
        // Error de red u otro error
        const isTimeout = error.name === "AbortError" || error.message?.includes("timeout");
        const errorMsg = isTimeout 
          ? "Timeout - el mensaje se reintentará más tarde"
          : error.message || "Network error";
        
        console.error(`[Offline Sync] Error enviando mensaje ${item.clientMessageId}:`, errorMsg);
        
        const newAttempts = item.attempts + 1;

        if (newAttempts > 8) {
          await markMessageFailed(item.clientMessageId, errorMsg);
          await removeFromOutbox(item.clientMessageId);
          console.warn(`[Offline Sync] Message failed after ${newAttempts} attempts: ${item.clientMessageId}`);
        } else {
          const nextRetry = calculateNextRetry(newAttempts);
          await updateAttempt(item.clientMessageId, {
            attempts: newAttempts,
            nextRetryAt: nextRetry,
            lastError: errorMsg,
          });
          console.log(`[Offline Sync] Retry scheduled for ${item.clientMessageId} (attempt ${newAttempts})`);
        }
      }
    }

    return synced;
  } finally {
    isSyncing = false;
  }
}

/**
 * Iniciar loop de sincronización
 */
export function startSyncLoop(): void {
  if (syncInterval) {
    return; // Ya está corriendo
  }

  // Sincronizar inmediatamente
  syncOutboxOnce();

  // Sincronizar cada 5 segundos
  syncInterval = setInterval(() => {
    syncOutboxOnce();
  }, 5000);

  // También sincronizar cuando se reconecta
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      if (process.env.NODE_ENV === "development") {
        console.log("[Offline Sync] Network online, syncing...");
      }
      syncOutboxOnce();
    });
  }
}

/**
 * Detener loop de sincronización
 */
export function stopSyncLoop(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

