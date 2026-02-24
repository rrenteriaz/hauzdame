// lib/offline/db.ts
import { openDB, DBSchema, IDBPDatabase } from "idb";

export interface ChatThread {
  threadId: string;
  tenantId: string;
  viewerUserId?: string; // ID del usuario que cacheó este thread (para validación de pertenencia)
  propertyId?: string;
  status: string;
  lastMessageAt: string | null;
  updatedAt: string;
  snapshot: any; // DTO completo para pintar inbox
}

export interface ChatMessage {
  id: string; // server id o compound key (threadId:clientMessageId)
  threadId: string;
  tenantId: string;
  senderUserId: string;
  body: string | null;
  type: "TEXT" | "IMAGE" | "SYSTEM";
  clientMessageId?: string | null;
  clientCreatedAt?: string | null;
  serverCreatedAt?: string | null;
  deliveryStatus?: "sending" | "sent" | "pending" | "failed";
  senderUser?: {
    id: string;
    name: string | null;
  } | null;
  asset?: {
    id: string;
    publicUrl: string | null;
  } | null;
}

export interface OutboxMessage {
  threadId: string;
  body: string;
  clientMessageId: string;
  clientCreatedAt: string;
  attempts: number;
  nextRetryAt: string;
  lastError?: string;
}

interface HausdameChatDB extends DBSchema {
  threads: {
    key: string; // threadId
    value: ChatThread;
    indexes: { lastMessageAt: string };
  };
  messages: {
    key: string; // messageId o compound key
    value: ChatMessage;
    indexes: {
      threadId: string;
      serverCreatedAt: string;
      clientCreatedAt: string;
    };
  };
  outbox: {
    key: string; // clientMessageId
    value: OutboxMessage;
    indexes: { nextRetryAt: string };
  };
  meta: {
    key: string;
    value: any;
  };
}

const DB_NAME = "hausdame_chat_v1";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<HausdameChatDB> | null = null;

export async function openChatDB(): Promise<IDBPDatabase<HausdameChatDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<HausdameChatDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Threads store
      if (!db.objectStoreNames.contains("threads")) {
        const threadsStore = db.createObjectStore("threads", { keyPath: "threadId" });
        threadsStore.createIndex("lastMessageAt", "lastMessageAt");
      }

      // Messages store
      if (!db.objectStoreNames.contains("messages")) {
        const messagesStore = db.createObjectStore("messages", { keyPath: "id", autoIncrement: false });
        messagesStore.createIndex("threadId", "threadId");
        messagesStore.createIndex("serverCreatedAt", "serverCreatedAt");
        messagesStore.createIndex("clientCreatedAt", "clientCreatedAt");
      }

      // Outbox store
      if (!db.objectStoreNames.contains("outbox")) {
        const outboxStore = db.createObjectStore("outbox", { keyPath: "clientMessageId" });
        outboxStore.createIndex("nextRetryAt", "nextRetryAt");
      }

      // Meta store
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
    },
  });

  return dbInstance;
}

export async function closeChatDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

