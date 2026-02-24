// lib/offline/chatCache.ts
import { openChatDB, type ChatThread, type ChatMessage } from "./db";

const MESSAGE_CACHE_DAYS = 15;

/**
 * Guardar threads en cache
 * Referencia: MESSAGES_V1.md - Sección 9: Al guardar cache, incluir tenantId y viewerUserId
 * 
 * @param threads Array de threads a guardar
 * @param options Opciones: viewerUserId (obligatorio para validación de pertenencia)
 */
export async function saveThreads(
  threads: any[],
  options?: { viewerUserId?: string }
): Promise<void> {
  const db = await openChatDB();
  const tx = db.transaction("threads", "readwrite");

  for (const thread of threads) {
    // Validar que el thread tiene tenantId antes de guardar
    if (!thread.tenantId) {
      console.warn("[chatCache] Thread sin tenantId, omitiendo guardado:", thread.id);
      continue;
    }

    // viewerUserId es opcional pero recomendado para validación robusta
    // Si no se proporciona, el thread se guarda pero puede no pasar validación futura
    await tx.store.put({
      threadId: thread.id,
      tenantId: thread.tenantId,
      viewerUserId: options?.viewerUserId || undefined,
      propertyId: thread.propertyId,
      status: thread.status,
      lastMessageAt: thread.lastMessageAt,
      updatedAt: new Date().toISOString(),
      snapshot: thread, // Guardar DTO completo (incluye tenantId y participants)
    });
  }

  await tx.done;
}

/**
 * Obtener threads cacheados
 */
export async function getCachedThreads(): Promise<ChatThread[]> {
  const db = await openChatDB();
  const tx = db.transaction("threads", "readonly");
  const index = tx.store.index("lastMessageAt");

  const threads = await index.getAll();
  await tx.done;

  // Ordenar por lastMessageAt desc
  return threads.sort((a, b) => {
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Guardar mensajes en cache
 */
export async function saveMessages(threadId: string, messages: any[]): Promise<void> {
  const db = await openChatDB();
  const tx = db.transaction("messages", "readwrite");

  for (const msg of messages) {
    // Usar id del servidor si existe, sino usar compound key
    const key = msg.id || `${threadId}:${msg.clientMessageId}`;

    await tx.store.put({
      id: msg.id || key,
      threadId,
      tenantId: msg.tenantId || "",
      senderUserId: msg.senderUserId,
      body: msg.body,
      type: msg.type || "TEXT",
      clientMessageId: msg.clientMessageId || key,
      clientCreatedAt: msg.clientCreatedAt || msg.serverCreatedAt,
      serverCreatedAt: msg.serverCreatedAt,
      deliveryStatus: msg.deliveryStatus || (msg.id ? "sent" : "pending"),
      senderUser: msg.senderUser,
      asset: msg.asset,
    });
  }

  await tx.done;
}

/**
 * Obtener mensajes cacheados para un thread
 */
export async function getCachedMessages(
  threadId: string,
  options?: { limit?: number; since?: string }
): Promise<ChatMessage[]> {
  const db = await openChatDB();
  const tx = db.transaction("messages", "readonly");
  const index = tx.store.index("threadId");

  let messages = await index.getAll(threadId);
  await tx.done;

  // Filtrar por fecha si se especifica
  if (options?.since) {
    const sinceDate = new Date(options.since);
    messages = messages.filter((msg) => {
      const msgDate = msg.serverCreatedAt
        ? new Date(msg.serverCreatedAt)
        : msg.clientCreatedAt
        ? new Date(msg.clientCreatedAt)
        : new Date();
      return msgDate >= sinceDate;
    });
  }

  // Ordenar por fecha ascendente (más antiguo primero)
  messages.sort((a, b) => {
    const timeA = a.serverCreatedAt
      ? new Date(a.serverCreatedAt).getTime()
      : a.clientCreatedAt
      ? new Date(a.clientCreatedAt).getTime()
      : 0;
    const timeB = b.serverCreatedAt
      ? new Date(b.serverCreatedAt).getTime()
      : b.clientCreatedAt
      ? new Date(b.clientCreatedAt).getTime()
      : 0;
    return timeA - timeB;
  });

  // Limitar si se especifica
  if (options?.limit) {
    messages = messages.slice(-options.limit);
  }

  return messages;
}

/**
 * Agregar o actualizar mensaje pendiente
 */
export async function upsertPendingMessage(message: ChatMessage): Promise<void> {
  const db = await openChatDB();
  const tx = db.transaction("messages", "readwrite");

  const key = message.id || `${message.threadId}:${message.clientMessageId}`;
  await tx.store.put({
    ...message,
    id: key,
    deliveryStatus: message.deliveryStatus || "pending",
  });

  await tx.done;
}

/**
 * Marcar mensaje como enviado (actualizar con datos del servidor)
 */
export async function markMessageSent(
  clientMessageId: string,
  serverMessage: any
): Promise<void> {
  const db = await openChatDB();
  const tx = db.transaction("messages", "readwrite");

  // Buscar por clientMessageId
  const index = tx.store.index("clientCreatedAt");
  const allMessages = await index.getAll();
  const pending = allMessages.find((m) => m.clientMessageId === clientMessageId);

  if (pending) {
    // Actualizar con datos del servidor
    await tx.store.put({
      ...pending,
      id: serverMessage.id,
      serverCreatedAt: serverMessage.serverCreatedAt,
      deliveryStatus: "sent",
      senderUser: serverMessage.senderUser,
      asset: serverMessage.asset,
    });
  }

  await tx.done;
}

/**
 * Marcar mensaje como fallido
 */
export async function markMessageFailed(
  clientMessageId: string,
  error?: string
): Promise<void> {
  const db = await openChatDB();
  const tx = db.transaction("messages", "readwrite");

  // Buscar por clientMessageId
  const cursor = await tx.store.openCursor();
  while (cursor) {
    if (cursor.value.clientMessageId === clientMessageId) {
      await tx.store.put({
        ...cursor.value,
        deliveryStatus: "failed",
      });
      break;
    }
    if (!(await cursor.continue())) break;
  }

  await tx.done;
}

/**
 * Purga mensajes antiguos (más de N días)
 */
export async function purgeOldMessages(days: number = MESSAGE_CACHE_DAYS): Promise<void> {
  const db = await openChatDB();
  const tx = db.transaction("messages", "readwrite");
  const index = tx.store.index("serverCreatedAt");

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const allMessages = await index.getAll();
  let deleted = 0;

  for (const msg of allMessages) {
    const msgDate = msg.serverCreatedAt
      ? new Date(msg.serverCreatedAt)
      : msg.clientCreatedAt
      ? new Date(msg.clientCreatedAt)
      : new Date();

    if (msgDate < cutoffDate && msg.deliveryStatus === "sent") {
      await tx.store.delete(msg.id || `${msg.threadId}:${msg.clientMessageId}`);
      deleted++;
    }
  }

  await tx.done;

  if (process.env.NODE_ENV === "development") {
    console.log(`[Offline] Purged ${deleted} messages older than ${days} days`);
  }
}

/**
 * Obtener última fecha de purga
 */
export async function getLastPurgeAt(): Promise<string | null> {
  const db = await openChatDB();
  const tx = db.transaction("meta", "readonly");
  const value = await tx.store.get("lastPurgeAt");
  await tx.done;
  return value || null;
}

/**
 * Guardar última fecha de purga
 */
export async function setLastPurgeAt(date: string): Promise<void> {
  const db = await openChatDB();
  const tx = db.transaction("meta", "readwrite");
  await tx.store.put(date, "lastPurgeAt");
  await tx.done;
}

/**
 * Obtener último viewerUserId guardado en meta store
 * Referencia: MESSAGES_V1.md - Regla 5: Cambio de usuario/tenant
 */
export async function getLastViewerUserId(): Promise<string | null> {
  const db = await openChatDB();
  const tx = db.transaction("meta", "readonly");
  const value = await tx.store.get("lastViewerUserId");
  await tx.done;
  return value || null;
}

/**
 * Guardar viewerUserId actual y invalidar cache si cambió
 * Referencia: MESSAGES_V1.md - Regla 5: Cambio de usuario/tenant
 * 
 * @returns true si hubo cambio de usuario (cache fue invalidado), false si es el mismo usuario
 */
export async function checkAndInvalidateOnUserChange(
  viewerUserId: string
): Promise<boolean> {
  const db = await openChatDB();
  
  // Usar transacción para atomicidad
  const metaTx = db.transaction("meta", "readwrite");
  const lastViewerUserId = await metaTx.store.get("lastViewerUserId");
  
  if (lastViewerUserId && lastViewerUserId !== viewerUserId) {
    // Cambió el usuario -> invalidar cache completo
    await metaTx.done;
    await clearCachedThreads();
    
    // Actualizar meta después de limpiar cache
    const updateTx = db.transaction("meta", "readwrite");
    await updateTx.store.put(viewerUserId, "lastViewerUserId");
    await updateTx.done;
    
    return true; // Hubo cambio
  }
  
  // Mismo usuario o primera vez -> solo actualizar meta
  await metaTx.store.put(viewerUserId, "lastViewerUserId");
  await metaTx.done;
  
  return false; // No hubo cambio
}

/**
 * Limpiar todos los threads del cache
 * Usado cuando el servidor retorna [] (DB vacía) o cuando cambia usuario/tenant
 * Referencia: MESSAGES_V1.md - Regla 2: Online + servidor retorna []
 */
export async function clearCachedThreads(): Promise<void> {
  const db = await openChatDB();
  const tx = db.transaction("threads", "readwrite");
  await tx.store.clear();
  await tx.done;
}

/**
 * Filtrar threads del cache por pertenencia (viewerUserId + tenantId)
 * Referencia: MESSAGES_V1.md - Sección 9: Identidad/partición del cache
 * 
 * Validación determinista y barata:
 * 1. viewerUserId explícito (MUST) - validación primaria y más confiable
 * 2. tenantId si está disponible (MUST) - validación secundaria
 * 3. snapshot debe existir
 * 
 * NO depende de snapshot.participants porque puede estar filtrado.
 */
export function filterValidCachedThreads(
  cachedThreads: ChatThread[],
  viewerUserId: string,
  currentTenantId?: string | null
): ChatThread[] {
  return cachedThreads.filter((cached) => {
    // Validación primaria: viewerUserId explícito (MUST)
    if (cached.viewerUserId && cached.viewerUserId !== viewerUserId) {
      return false;
    }

    // Si no hay viewerUserId guardado, el thread es antiguo (pre-fix)
    // En ese caso, validar por tenantId si está disponible
    if (!cached.viewerUserId) {
      if (currentTenantId && cached.tenantId !== currentTenantId) {
        return false;
      }
      // Sin viewerUserId ni tenantId -> no podemos validar, descartar por seguridad
      if (!currentTenantId) {
        return false;
      }
    }

    // Validación secundaria: tenantId si está disponible
    if (currentTenantId && cached.tenantId !== currentTenantId) {
      return false;
    }

    // Validar que el snapshot tiene la estructura necesaria
    if (!cached.snapshot || typeof cached.snapshot !== "object") {
      return false;
    }

    return true;
  });
}

