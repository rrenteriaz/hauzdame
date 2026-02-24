// lib/offline/outbox.ts
import { openChatDB, type OutboxMessage } from "./db";

/**
 * Agregar mensaje a la cola de outbox
 */
export async function enqueueMessage(
  threadId: string,
  body: string,
  clientMessageId: string,
  clientCreatedAt: string
): Promise<void> {
  const db = await openChatDB();
  const tx = db.transaction("outbox", "readwrite");

  await tx.store.put({
    threadId,
    body,
    clientMessageId,
    clientCreatedAt,
    attempts: 0,
    nextRetryAt: new Date().toISOString(), // Intentar inmediatamente
  });

  await tx.done;
}

/**
 * Obtener mensajes pendientes listos para reintentar
 */
export async function getPendingOutbox(now: Date): Promise<OutboxMessage[]> {
  const db = await openChatDB();
  const tx = db.transaction("outbox", "readonly");
  const index = tx.store.index("nextRetryAt");

  const all = await index.getAll();
  await tx.done;

  // Filtrar los que están listos para reintentar
  return all.filter((msg) => new Date(msg.nextRetryAt) <= now).slice(0, 10); // Max 10 por batch
}

/**
 * Actualizar intento de envío
 */
export async function updateAttempt(
  clientMessageId: string,
  updates: {
    attempts: number;
    nextRetryAt: string;
    lastError?: string;
  }
): Promise<void> {
  const db = await openChatDB();
  const tx = db.transaction("outbox", "readwrite");

  const existing = await tx.store.get(clientMessageId);
  if (existing) {
    await tx.store.put({
      ...existing,
      ...updates,
    });
  }

  await tx.done;
}

/**
 * Remover mensaje de outbox (enviado exitosamente)
 */
export async function removeFromOutbox(clientMessageId: string): Promise<void> {
  const db = await openChatDB();
  const tx = db.transaction("outbox", "readwrite");
  await tx.store.delete(clientMessageId);
  await tx.done;
}

/**
 * Calcular próximo retry con backoff exponencial + jitter
 */
export function calculateNextRetry(attempts: number): string {
  const baseDelay = 2000; // 2 segundos
  const maxDelay = 60000; // 60 segundos
  const jitter = Math.random() * 500; // 0-500ms aleatorio

  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
  const totalDelay = exponentialDelay + jitter;

  const nextRetry = new Date();
  nextRetry.setMilliseconds(nextRetry.getMilliseconds() + totalDelay);

  return nextRetry.toISOString();
}

