// lib/chat/mergeMessages.ts

import { chatDbg } from "@/lib/utils/chatDebug";

export interface Message {
  id: string;
  body: string | null;
  type: "TEXT" | "IMAGE" | "SYSTEM";
  senderUserId: string;
  senderUser?: {
    id: string;
    name: string | null;
  } | null;
  asset?: {
    id: string;
    publicUrl: string | null;
  } | null;
  serverCreatedAt: string | null;
  clientMessageId?: string | null;
  clientCreatedAt?: string | null;
  deliveryStatus?: "sent" | "pending" | "failed" | "sending";
  threadId?: string;
  tenantId?: string;
  serverId?: string; // ID del servidor (cuando el mensaje se crea en el servidor)
  isPending?: boolean; // Alias para deliveryStatus === "pending"
}

/**
 * Combina dos arrays de mensajes eliminando duplicados por key canónica
 * Key canónica: clientMessageId ?? serverId ?? id
 * El servidor es source of truth - los mensajes del servidor sobrescriben los locales
 * Ordena por serverCreatedAt/clientCreatedAt ascendente (más antiguo primero)
 */
export function mergeMessagesById(
  prev: Message[],
  incoming: Message[]
): Message[] {
  const messageMap = new Map<string, Message>();

  // Función helper para obtener key canónica
  const getCanonicalKey = (msg: Message): string => {
    return msg.clientMessageId ?? msg.serverId ?? msg.id;
  };

  // 1) Primero agregar mensajes del servidor (source of truth)
  // El servidor siempre gana - si hay duplicados, el último del servidor sobrescribe
  incoming.forEach((msg) => {
    const key = getCanonicalKey(msg);
    const localId = msg.clientMessageId ? `temp-${msg.clientMessageId}` : msg.id;
    messageMap.set(key, {
      ...msg,
      id: localId,
      deliveryStatus: msg.deliveryStatus || "sent",
      isPending: false,
      serverId: msg.id,
    });
  });

  // 2) Luego agregar mensajes locales SOLO si no existen en el servidor
  prev.forEach((msg) => {
    const key = getCanonicalKey(msg);
    if (!messageMap.has(key)) {
      messageMap.set(key, msg);
    } else {
      // Si existe, verificar si el existente es del servidor
      const existing = messageMap.get(key)!;
      const existingIsServer = !!existing.serverId || !!existing.serverCreatedAt;
      const localIsServer = !!msg.serverId || !!msg.serverCreatedAt;
      
      // Solo reemplazar si el existente es local y el nuevo es del servidor
      // (esto no debería pasar porque ya procesamos incoming primero, pero por seguridad)
      if (!existingIsServer && localIsServer) {
        messageMap.set(key, msg);
      }
    }
  });

  // Convertir a array y ordenar por serverCreatedAt/clientCreatedAt (o createdAt como fallback)
  const merged = Array.from(messageMap.values()).sort((a, b) => {
    const timeA = new Date(
      a.serverCreatedAt || a.clientCreatedAt || new Date()
    ).getTime();
    const timeB = new Date(
      b.serverCreatedAt || b.clientCreatedAt || new Date()
    ).getTime();
    return timeA - timeB;
  });

  // Instrumentación mínima (solo si CHAT_DEBUG)
  const keys = merged.map(getCanonicalKey);
  const uniqueKeys = new Set(keys);
  const dups = merged.length - uniqueKeys.size;
  
  if (dups > 0) {
    // Encontrar keys duplicadas
    const keyCounts = new Map<string, number>();
    keys.forEach(k => keyCounts.set(k, (keyCounts.get(k) || 0) + 1));
    const duplicateKeys = Array.from(keyCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([key]) => key);
    
    chatDbg("MERGE final duplicate keys detected", {
      total: merged.length,
      unique: uniqueKeys.size,
      dups,
      duplicateKeys,
      messagesWithDups: merged
        .filter(m => duplicateKeys.includes(getCanonicalKey(m)))
        .map(m => ({ key: getCanonicalKey(m), id: m.id, clientMessageId: m.clientMessageId, serverId: m.serverId }))
    });
  } else {
    chatDbg("MERGE final uniqueKeys", {
      total: merged.length,
      unique: uniqueKeys.size,
      dups: 0
    });
  }

  return merged;
}

/**
 * Obtiene el último mensaje (más reciente) de un array
 */
export function getLastMessage(messages: Message[]): Message | null {
  if (messages.length === 0) return null;
  
  return messages.reduce((latest, current) => {
    const latestTime = new Date(latest.serverCreatedAt || latest.clientCreatedAt || new Date()).getTime();
    const currentTime = new Date(current.serverCreatedAt || current.clientCreatedAt || new Date()).getTime();
    return currentTime > latestTime ? current : latest;
  });
}

