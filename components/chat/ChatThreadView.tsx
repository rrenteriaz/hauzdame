// components/chat/ChatThreadView.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useThreadRealtime } from "@/lib/chat/useThreadRealtime";
import { mergeMessagesById, type Message } from "@/lib/chat/mergeMessages";
import { useNetworkStatus } from "@/lib/offline/useNetworkStatus";
import {
  getCachedMessages,
  saveMessages,
  upsertPendingMessage,
  markMessageSent,
  markMessageFailed,
} from "@/lib/offline/chatCache";
import { enqueueMessage } from "@/lib/offline/outbox";
import { startSyncLoop, stopSyncLoop } from "@/lib/offline/sync";
import { ImageMessage } from "./ImageMessage";
import { ImageViewerModal } from "./ImageViewerModal";
import { dbg } from "@/lib/debug/persistLog";
import { DebugPanel } from "@/components/debug/DebugPanel";
import { safeUuid } from "@/lib/utils/safeUuid";
import { getChatDebug, chatDbg } from "@/lib/utils/chatDebug";

interface ChatThreadViewProps {
  threadId: string;
  threadStatus?: string;
  applicationStatus?: string;
  userRole?: "HOST" | "CLEANER";
  viewerUserId?: string; // ID del usuario que está viendo el thread (para calcular isOwn de forma estable)
  counterpartName?: string; // Nombre de la contraparte (para mostrar en header)
  threadType?: "HOST_CLEANER" | "HOST_TEAM" | "TEAM_INTERNAL" | "HOST_HOST"; // Tipo de thread
  viewerParticipantRole?: "OWNER" | "ADMIN" | "MEMBER"; // Role del viewer en el thread
}

interface UploadingImage {
  file: File;
  preview: string;
  assetId?: string;
  status: "uploading" | "failed";
}

export function ChatThreadView({ 
  threadId, 
  threadStatus, 
  applicationStatus,
  userRole,
  viewerUserId: viewerUserIdProp,
  counterpartName,
  threadType,
  viewerParticipantRole
}: ChatThreadViewProps) {
  // Build fingerprint para verificar que el código nuevo está cargado
  const BUILD_FINGERPRINT = "chat-debug-2026-01-08T15:30Z";

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOnline } = useNetworkStatus();

  // Obtener userId y tenantId desde el servidor
  const [senderUserId, setSenderUserId] = useState<string | null>(viewerUserIdProp || null);
  const [senderTenantId, setSenderTenantId] = useState<string | null>(null);
  const router = useRouter();
  
  // Flag de debug reactivo (se actualiza cuando cambia la URL)
  const [chatDebug, setChatDebug] = useState(() => getChatDebug());
  
  // Actualizar flag de debug cuando cambia la URL (para soportar ?debug=1 dinámico)
  useEffect(() => {
    const updateDebugFlag = () => {
      setChatDebug(getChatDebug());
    };
    
    // Verificar al montar
    updateDebugFlag();
    
    // Escuchar cambios en la URL (popstate para navegación back/forward)
    window.addEventListener("popstate", updateDebugFlag);
    
    return () => {
      window.removeEventListener("popstate", updateDebugFlag);
    };
  }, []);
  
  // viewerUserId estable: usar prop si está disponible, sino usar estado (fallback)
  const viewerUserId = viewerUserIdProp || senderUserId;

  // Inicializar sync loop
  useEffect(() => {
    startSyncLoop();
    return () => {
      stopSyncLoop();
    };
  }, []);

  // Log BUILD_FINGERPRINT al montar (solo en debug)
  useEffect(() => {
    if (chatDebug) {
      chatDbg("BUILD_FINGERPRINT", { BUILD_FINGERPRINT });
    }
  }, [chatDebug]);

  // Listeners completos para detectar submit/navegación + captura global de errores (solo si debug está activo)
  useEffect(() => {
    if (!chatDebug) {
      return;
    }

    const log = (name: string, extra?: any) => {
      try {
        chatDbg(name, { 
          ...extra, 
          BUILD_FINGERPRINT, 
          href: typeof window !== "undefined" ? window.location.href : "N/A",
          vis: typeof document !== "undefined" ? document.visibilityState : "N/A"
        });
      } catch {}
      try {
        console.log("[NAV]", name, extra);
      } catch {}
    };

    const onSubmit = (e: Event) => {
      log("GLOBAL submit event", { target: (e.target as any)?.tagName });
      e.preventDefault();
      e.stopPropagation();
      log("FORM SUBMIT prevented");
    };

    const onBeforeUnload = () => {
      log("beforeunload fired");
    };

    const onPageHide = (e: PageTransitionEvent) => {
      log("pagehide fired", { persisted: e.persisted });
    };

    const onVisibility = () => {
      log("visibilitychange", { vis: document.visibilityState });
    };

    const onPopState = () => {
      log("popstate fired");
    };

    // Captura global de errores (solo loguear, no alertar en producción)
    const onError = (msg: string | Event, src?: string, line?: number, col?: number, err?: Error) => {
      log("window.onerror", { 
        msg: typeof msg === "string" ? msg : "Event", 
        src, 
        line, 
        col, 
        stack: err?.stack 
      });
      // Solo alertar en debug
      if (chatDebug && typeof window !== "undefined") {
        console.warn("window.onerror:", typeof msg === "string" ? msg : "Unknown error");
      }
      return false;
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event.reason;
      log("unhandledrejection", { 
        message: reason?.message, 
        stack: reason?.stack, 
        reason: String(reason)
      });
      // Solo alertar en debug
      if (chatDebug && typeof window !== "undefined") {
        console.warn("unhandledrejection:", reason?.message ?? "unknown");
      }
    };

    // Agregar listeners
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("submit", onSubmit, true);
    
    // Captura global de errores
    window.onerror = onError;
    window.onunhandledrejection = onUnhandledRejection;

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("submit", onSubmit, true);
      
      // Limpiar handlers globales
      window.onerror = null;
      window.onunhandledrejection = null;
    };
  }, []);

  useEffect(() => {
    // Obtener userId y tenantId del servidor
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.id) {
          setSenderUserId(data.user.id);
          setSenderTenantId(data.user.tenantId || null);
          chatDbg("senderUserId and tenantId loaded", { 
            userId: data.user.id, 
            tenantId: data.user.tenantId 
          });
        } else {
          chatDbg("senderUserId NOT found in /api/auth/me response");
        }
      })
      .catch((error) => {
        chatDbg("Error loading senderUserId:", error.message);
        // Si falla, intentar cargar mensajes de todas formas
      });

    // Cargar cache primero
    loadCachedMessages();
    
    // Luego cargar desde servidor si está online
    if (isOnline) {
      loadMessages();
    }
  }, [threadId, isOnline]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    // Scrollear solo el contenedor de mensajes, no el body
    // Usar scrollTop en el contenedor para evitar scroll del body
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Cargar mensajes desde cache
  const loadCachedMessages = async () => {
    try {
      const cached = await getCachedMessages(threadId, { limit: 50 });
      if (cached.length > 0) {
        // Convertir ChatMessage a Message
        const messages: Message[] = cached.map((msg) => ({
          id: msg.id,
          body: msg.body,
          type: msg.type,
          senderUserId: msg.senderUserId,
          senderUser: msg.senderUser || null,
          asset: msg.asset || null,
          serverCreatedAt: msg.serverCreatedAt || null,
          clientMessageId: msg.clientMessageId || null,
          clientCreatedAt: msg.clientCreatedAt || null,
          deliveryStatus: msg.deliveryStatus,
          threadId: msg.threadId,
          tenantId: msg.tenantId,
        }));
        setMessages(messages);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error cargando cache:", error);
    }
  };

  const loadMessages = async (cursor?: string) => {
    if (!isOnline && !cursor) {
      return; // No intentar carga inicial si está offline
    }

    try {
      const url = new URL(`/api/chat/threads/${threadId}/messages`, window.location.origin);
      url.searchParams.set("limit", "30");
      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

      const res = await fetch(url.toString());
      const data = await res.json();
      const newMessages = data.messages || [];
      
      if (cursor) {
        // Cargar mensajes anteriores (prepend)
        setMessages((prev) => [...newMessages, ...prev]);
        setHasMore(data.nextCursor !== null);
      } else {
        // Carga inicial - hacer merge con mensajes existentes (cache) para no perder mensajes optimistas
        setMessages((prev) => {
          chatDbg("MERGE loadMessages before", { 
            server: newMessages.length, 
            local: prev.length 
          });
          
          // Merge con mensajes previos (del cache)
          const merged = mergeMessagesById(prev, newMessages);
          
          chatDbg("MERGE loadMessages after", { 
            merged: merged.length, 
            dupesRemoved: (newMessages.length + prev.length) - merged.length 
          });
          
          // Ordenar por serverCreatedAt ascendente
          return merged.sort((a, b) => {
            const timeA = new Date(a.serverCreatedAt || a.clientCreatedAt || new Date()).getTime();
            const timeB = new Date(b.serverCreatedAt || b.clientCreatedAt || new Date()).getTime();
            return timeA - timeB;
          });
        });
        setHasMore(data.nextCursor !== null);
      }

      // Guardar en cache (solo carga inicial)
      if (!cursor) {
        await saveMessages(threadId, newMessages);
      }
    } catch (error) {
      console.error("Error cargando mensajes:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;

    const oldestMessage = messages[0];
    if (!oldestMessage?.serverCreatedAt) return;

    setLoadingMore(true);
    
    // Guardar posición de scroll antes de cargar
    const scrollContainer = messagesTopRef.current?.parentElement;
    const scrollHeight = scrollContainer?.scrollHeight || 0;
    const scrollTop = scrollContainer?.scrollTop || 0;

    await loadMessages(oldestMessage.serverCreatedAt);

    // Restaurar posición de scroll después de renderizar
    setTimeout(() => {
      if (scrollContainer) {
        const newScrollHeight = scrollContainer.scrollHeight;
        scrollContainer.scrollTop = scrollTop + (newScrollHeight - scrollHeight);
      }
    }, 0);
  };

  // Función para refrescar mensajes cuando llega uno nuevo vía realtime
  const refreshMessages = async () => {
    if (!isOnline) {
      return;
    }

    try {
      const url = new URL(`/api/chat/threads/${threadId}/messages`, window.location.origin);
      url.searchParams.set("limit", "30");
      
      const res = await fetch(url.toString());
      const data = await res.json();
      const serverMessages = data.messages || [];
      
      // PARTE C: Merge/Dedupe al refrescar mensajes
      setMessages((prev) => {
        chatDbg("MERGE before", { 
          server: serverMessages.length, 
          local: prev.length 
        });
        
        const merged = mergeMessagesById(prev, serverMessages);
        
        chatDbg("MERGE after", { 
          merged: merged.length, 
          dupesRemoved: (serverMessages.length + prev.length) - merged.length 
        });
        
        return merged;
      });
    } catch (error) {
      console.error("Error refrescando mensajes:", error);
    }
  };

  // Suscripción a realtime para este thread
  useThreadRealtime({
    threadId,
    onNewMessage: refreshMessages,
    enabled: !!threadId && !loading,
  });

  const handleSend = async () => {
      chatDbg("handleSend enter UNIQUE_X2", { BUILD_FINGERPRINT });
    
    let optimisticMessage: Message | null = null;

    try {
      chatDbg("handleSend try begin");
      
      chatDbg("handleSend start UNIQUE_X1", { 
        text: messageText, 
        sending, 
        senderUserId, 
        isOnline, 
        threadId,
        messageTextLength: messageText.length,
        messageTextTrimmed: messageText.trim().length,
        BUILD_FINGERPRINT
      });

      chatDbg("M1 after start");

      // Guard clauses con debug - estos retornan ANTES de setSending(true), así que no necesitan finally
      chatDbg("M2 before messageText.trim check");
      if (!messageText.trim()) {
        chatDbg("handleSend early return: messageText empty", { messageText });
        return;
      }
      chatDbg("M3 after messageText.trim check");

      chatDbg("M4 before sending check");
      if (sending) {
        chatDbg("handleSend early return: already sending", { sending });
        return;
      }
      chatDbg("M5 after sending check");

      // Manejar senderUserId null dentro de handleSend
      chatDbg("M6 before senderUserId check");
      let currentSenderUserId = senderUserId;
      if (!currentSenderUserId) {
        chatDbg("senderUserId null: refetching /api/auth/me");
        try {
          const userRes = await fetch("/api/auth/me");
          if (userRes.ok) {
            const userData = await userRes.json();
            currentSenderUserId = userData.user?.id || null;
            const tenantIdFromFetch = userData.user?.tenantId || null;
            if (currentSenderUserId) {
              setSenderUserId(currentSenderUserId);
              setSenderTenantId(tenantIdFromFetch);
              chatDbg("senderUserId loaded in handleSend", { 
                userId: currentSenderUserId, 
                tenantId: tenantIdFromFetch 
              });
            } else {
              chatDbg("senderUserId still null after refetch");
              // Mostrar error visible y NO setSending(true)
              if (chatDebug) {
                alert("Error: No se pudo obtener el ID de usuario. Por favor, recarga la página.");
              }
              return;
            }
          } else {
            chatDbg("Error fetching /api/auth/me", { status: userRes.status });
            if (chatDebug) {
              alert("Error: No se pudo obtener el ID de usuario. Por favor, recarga la página.");
            }
            return;
          }
        } catch (error: any) {
          chatDbg("Error fetching /api/auth/me", error.message);
          if (chatDebug) {
            alert("Error: No se pudo obtener el ID de usuario. Por favor, recarga la página.");
          }
          return;
        }
      }
      chatDbg("M7 after senderUserId check");

      // Verificar tenantId - usar el guardado en estado, NO hacer segundo fetch
      chatDbg("M8 before tenantId check");
      if (!senderTenantId) {
        chatDbg("tenantId null, blocking send");
        if (chatDebug) {
          alert("Sesión no lista, recarga la página.");
        }
        return;
      }
      chatDbg("M9 after tenantId check");

      // A partir de aquí, SIEMPRE debemos ejecutar setSending(false) en finally
      chatDbg("M10 before text.trim");
      const text = messageText.trim();
      chatDbg("M11 after text.trim", { textLength: text.length });

      chatDbg("M12 before setMessageText('')");
      setMessageText("");
      chatDbg("M13 after setMessageText");

      chatDbg("M14 before setSending(true)");
      setSending(true);
      chatDbg("M15 after setSending(true)");

      chatDbg("M16 before uuid");
      const clientMessageId = safeUuid();
      chatDbg("M17 after uuid", { clientMessageId });
      
      chatDbg("M18 before clientCreatedAt");
      const clientCreatedAt = new Date().toISOString();
      chatDbg("M19 after clientCreatedAt", { clientCreatedAt });

      // Usar tenantId del estado, no hacer segundo fetch
      chatDbg("M20 before tenantId assignment");
      const tenantId = senderTenantId;
      chatDbg("M21 after tenantId assignment", { tenantId });

      // Crear mensaje optimista
      chatDbg("M22 before optimistic message build");
      optimisticMessage = {
        id: `temp-${clientMessageId}`,
        body: text,
        type: "TEXT",
        senderUserId: currentSenderUserId,
        senderUser: {
          id: currentSenderUserId,
          name: "Tú",
        },
        serverCreatedAt: clientCreatedAt,
        clientMessageId,
        deliveryStatus: "sending",
        isPending: true,
        threadId,
        tenantId,
      };
      chatDbg("M23 after optimistic message build", { optimisticMessageId: optimisticMessage.id });

      // Agregar a UI inmediatamente
      chatDbg("M24 before setMessages append");
      setMessages((prev) => [...prev, optimisticMessage!]);
      chatDbg("M25 after setMessages append");
      
      // Scroll inmediato al nuevo mensaje
      chatDbg("M26 before setTimeout scroll");
      setTimeout(() => {
        scrollToBottom();
      }, 50);
      chatDbg("M27 after setTimeout scroll");

      // Guardar en cache y outbox (solo si tiene threadId y tenantId) - aislado, no debe abortar envío
      chatDbg("M28 before cache/outbox check");
      if (threadId && tenantId) {
        chatDbg("M29 before upsertPendingMessage");
        try {
          if (!optimisticMessage) {
            throw new Error("optimisticMessage is null");
          }
          await upsertPendingMessage({
            ...optimisticMessage,
            threadId,
            tenantId,
            clientMessageId: optimisticMessage.clientMessageId || null,
            clientCreatedAt: optimisticMessage.clientCreatedAt || null,
            serverCreatedAt: optimisticMessage.serverCreatedAt || null,
            deliveryStatus: optimisticMessage.deliveryStatus || "sending",
            senderUser: optimisticMessage.senderUser || undefined,
          });
          chatDbg("M30 after upsertPendingMessage");
        } catch (error) {
          chatDbg("M31 upsertPendingMessage error", { error: (error as any)?.message });
          console.warn("[handleSend] Error guardando en cache (continuando):", error);
          // Continuar, el mensaje se enviará pero no se cacheará
        }

        chatDbg("M32 before enqueueMessage");
        try {
          await enqueueMessage(threadId, text, clientMessageId, clientCreatedAt);
          chatDbg("M33 after enqueueMessage");
        } catch (error) {
          chatDbg("M34 enqueueMessage error", { error: (error as any)?.message });
          console.warn("[handleSend] Error agregando a outbox (continuando):", error);
          // Continuar, el mensaje se enviará pero no estará en outbox
        }
      } else {
        chatDbg("M35 skipping cache/outbox", { hasThreadId: !!threadId, hasTenantId: !!tenantId });
      }

      // Si está online, intentar enviar inmediatamente
      chatDbg("M36 before isOnline check", { isOnline });
      if (isOnline) {
        chatDbg("M37 before abortController");
        const abortController = new AbortController();
        chatDbg("M38 after abortController");
        
        // Aumentar timeout a 30 segundos para conexiones móviles lentas
        chatDbg("M39 before setTimeout timeout");
        const timeoutId = setTimeout(() => {
          console.warn("[handleSend] Timeout alcanzado, abortando request");
          abortController.abort();
        }, 30000); // 30 segundos timeout (aumentado para móvil)
        chatDbg("M40 after setTimeout timeout");

        try {
          chatDbg("M41 before payload build");
          const payload = {
            body: text,
            clientMessageId,
            clientCreatedAt,
            type: "TEXT",
          };
          chatDbg("M42 after payload build", { payload });
          
          chatDbg("M43 before POST start");
          chatDbg("POST start /api/chat/threads/.../messages", { 
            threadId, 
            clientMessageId, 
            payload,
            url: `/api/chat/threads/${threadId}/messages`
          });
          
          chatDbg("M44 before fetch call");
          const res = await fetch(`/api/chat/threads/${threadId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: abortController.signal,
            // Agregar keepalive para mejorar confiabilidad en móvil
            keepalive: false,
          });
          chatDbg("M45 after fetch call");
          chatDbg("M46 after fetch call - response received");

          clearTimeout(timeoutId);
          chatDbg("M46 after clearTimeout");
          
          chatDbg("M47 before POST response parse");
          chatDbg("POST response", { 
            ok: res.ok, 
            status: res.status, 
            statusText: res.statusText,
            headers: Object.fromEntries(res.headers.entries())
          });
          
          // PARTE A: Log del body real del response
          const clone = res.clone();
          let rawText = "";
          try {
            rawText = await clone.text();
          } catch (e: any) {
            rawText = "[clone.text failed: " + (e?.message || "unknown") + "]";
          }
          
          chatDbg("M48 response rawText", { 
            status: res.status, 
            rawText: rawText.slice(0, 2000),
            rawTextLength: rawText.length
          });
          
          // Parsear respuesta de forma robusta
          let data: any = null;
          const contentType = res.headers.get("content-type");
          
          if (!contentType?.includes("application/json")) {
            chatDbg("M49 response not JSON", { contentType, rawText: rawText.slice(0, 500) });
            // Si no es JSON, leer como texto para logging
            try {
              console.error("[handleSend] Respuesta no es JSON:", rawText);
              throw new Error(`Respuesta inválida del servidor: ${res.status} - ${rawText.substring(0, 100)}`);
            } catch (textError: any) {
              // Si falla leer texto, lanzar error genérico
              throw new Error(`Respuesta inválida del servidor: ${res.status}`);
            }
          }
          
          try {
            data = await res.json();
            chatDbg("M49 response json", { 
              keys: Object.keys(data ?? {}), 
              hasMessage: !!data?.message,
              hasData: !!data?.data,
              hasError: !!data?.error,
              messageId: data?.message?.id || data?.id,
              clientMessageId: data?.message?.clientMessageId || data?.clientMessageId,
              data: JSON.stringify(data).slice(0, 1000)
            });
            console.log("POST RESULT", res.status, data);
          } catch (parseError: any) {
            chatDbg("M49 response json parse failed", { 
              message: parseError?.message, 
              rawText: rawText.slice(0, 500) 
            });
            console.error("[handleSend] Error parseando JSON:", parseError);
            throw new Error(`Error parseando respuesta JSON: ${parseError.message}`);
          }

          if (res.ok) {
            console.log("[handleSend] Mensaje enviado exitosamente");
            
            // Obtener el mensaje del servidor (puede estar en data.message o data)
            const serverMessage = data?.message || data;
            
            if (data.isDuplicate) {
              // Ya existe, actualizar con datos del servidor
              chatDbg("M50 before reconcile (duplicate)", { 
                tempId: optimisticMessage!.id,
                clientMessageId,
                serverMessageId: serverMessage?.id
              });
              
              try {
                await markMessageSent(clientMessageId, serverMessage);
              } catch (error) {
                console.warn("[handleSend] Error actualizando cache (mensaje enviado):", error);
              }
              
              // PARTE B: Reconciliación del mensaje optimista - NO cambiar id, usar serverId
              setMessages((prev) => {
                const updated = prev.map((m) => {
                  if (m.id === optimisticMessage!.id || m.clientMessageId === clientMessageId) {
                    const reconciled: Message = {
                      ...m,
                      // NO cambiar id - mantener el id actual (temp-...)
                      serverId: serverMessage?.id || m.serverId,
                      deliveryStatus: "sent" as const,
                      isPending: false,
                      serverCreatedAt: serverMessage?.serverCreatedAt || serverMessage?.createdAt || m.serverCreatedAt,
                      clientMessageId: serverMessage?.clientMessageId || m.clientMessageId,
                      clientCreatedAt: serverMessage?.clientCreatedAt || m.clientCreatedAt,
                      senderUser: serverMessage?.senderUser || m.senderUser,
                      asset: serverMessage?.asset || m.asset,
                      body: serverMessage?.body ?? m.body,
                      type: serverMessage?.type ?? m.type,
                    };
                    return reconciled;
                  }
                  return m;
                });
                return updated;
              });
              
              chatDbg("M51 after reconcile (duplicate)", { 
                clientMessageId,
                serverId: serverMessage?.id,
                messagesCount: messages.length
              });
            } else {
              // Enviado exitosamente
              chatDbg("M50 before reconcile (new)", { 
                tempId: optimisticMessage!.id,
                clientMessageId,
                serverMessageId: serverMessage?.id,
                serverMessageKeys: Object.keys(serverMessage || {})
              });
              
              try {
                await markMessageSent(clientMessageId, serverMessage);
              } catch (error) {
                console.warn("[handleSend] Error actualizando cache (mensaje enviado):", error);
              }
              
              // PARTE B: Reconciliación del mensaje optimista - NO cambiar id, usar serverId
              setMessages((prev) => {
                const updated = prev.map((m) => {
                  if (m.id === optimisticMessage!.id || m.clientMessageId === clientMessageId) {
                    const reconciled: Message = {
                      ...m,
                      // NO cambiar id - mantener el id actual (temp-...)
                      serverId: serverMessage?.id || m.serverId,
                      deliveryStatus: "sent" as const,
                      isPending: false,
                      serverCreatedAt: serverMessage?.serverCreatedAt || serverMessage?.createdAt || m.serverCreatedAt,
                      clientMessageId: serverMessage?.clientMessageId || m.clientMessageId,
                      clientCreatedAt: serverMessage?.clientCreatedAt || m.clientCreatedAt,
                      senderUser: serverMessage?.senderUser || m.senderUser,
                      asset: serverMessage?.asset || m.asset,
                      body: serverMessage?.body ?? m.body,
                      type: serverMessage?.type ?? m.type,
                    };
                    return reconciled;
                  }
                  return m;
                });
                return updated;
              });
              
              chatDbg("M51 after reconcile (new)", { 
                clientMessageId,
                serverId: serverMessage?.id,
                messagesCount: messages.length
              });
              
              // Scroll al mensaje confirmado
              setTimeout(() => {
                scrollToBottom();
              }, 100);
              
              // PARTE C: Refresh de la lista (si usas server components)
              chatDbg("M52 before router.refresh");
              router.refresh();
              chatDbg("M53 after router.refresh");
              
              // Refrescar mensajes desde el servidor
              chatDbg("M53b before refreshMessages");
              await refreshMessages();
              chatDbg("M53c after refreshMessages");
              
              // PARTE E: GET inmediato después del POST (solo si debug está activo)
              if (chatDebug) {
                chatDbg("M54 dev GET messages start");
                try {
                  const res2 = await fetch(
                    `/api/chat/threads/${threadId}/messages?limit=10`
                  );
                  const t2 = await res2.text();
                  chatDbg("M55 dev GET messages response", { 
                    status: res2.status, 
                    t2: t2.slice(0, 1000),
                    includesClientMessageId: t2.includes(clientMessageId),
                    includesServerMessageId: serverMessage?.id ? t2.includes(serverMessage.id) : false
                  });
                } catch (getError: any) {
                  chatDbg("M55 dev GET messages error", { error: getError?.message });
                }
              }
            }
          } else {
            // Error del servidor, marcar como fallido
            chatDbg("POST not ok", { status: res.status, statusText: res.statusText, data });
            const errorMsg = data.error || `Error ${res.status}: ${res.statusText}`;
            try {
              await markMessageFailed(clientMessageId, errorMsg);
            } catch (error) {
              console.warn("[handleSend] Error actualizando cache (mensaje fallido):", error);
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.clientMessageId === clientMessageId
                  ? { ...m, deliveryStatus: "failed" as const }
                  : m
              )
            );
          }
        } catch (error: any) {
          clearTimeout(timeoutId);
          
          chatDbg("POST error", { 
            error: error?.message, 
            name: error?.name,
            stack: error?.stack?.substring(0, 200)
          });
          
          // Determinar tipo de error
          const isTimeout = error.name === "AbortError" || error.message?.includes("timeout");
          const isNetworkError = error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError");
          const errorMsg = isTimeout 
            ? "Tiempo de espera agotado. El mensaje se guardó y se enviará más tarde."
            : isNetworkError
            ? "Error de conexión. El mensaje se guardó y se enviará más tarde."
            : error.message || "Error de red";
          
          // NO marcar como fallido inmediatamente - dejar en "pending" para que el sync loop lo maneje
          // El mensaje ya está en outbox y el sync loop lo reintentará
          // Solo marcar como fallido si es un error que no debería reintentarse
          const shouldRetry = isTimeout || isNetworkError;
          
          if (!shouldRetry) {
            // Error que no debería reintentarse (ej: error de validación)
            try {
              await markMessageFailed(clientMessageId, errorMsg);
            } catch (cacheError) {
              console.warn("[handleSend] Error actualizando cache (mensaje fallido):", cacheError);
            }
            
            // Actualizar UI a "failed"
            setMessages((prev) =>
              prev.map((m) =>
                m.clientMessageId === clientMessageId
                  ? { ...m, deliveryStatus: "failed" as const }
                  : m
              )
            );
          } else {
            // Error que debería reintentarse - mantener en "pending"
            // El sync loop lo manejará
            chatDbg(`Mensaje ${clientMessageId} quedará en outbox para reintento`);
          }
        }
      } else {
        // Offline: mostrar toast
        chatDbg("handleSend: offline, mensaje guardado en outbox");
        if (typeof window !== "undefined" && chatDebug) {
          // Toast simple (puede mejorarse con librería) - solo en debug
          alert("Mensaje guardado. Se enviará al reconectar.");
        }
      }
    } catch (err: any) {
      // Error crítico inesperado (síncrono o asíncrono) - asegurar que el mensaje se marque como fallido
      chatDbg("handleSend crash", { 
        message: err?.message, 
        name: err?.name,
        stack: err?.stack?.substring(0, 500),
        BUILD_FINGERPRINT
      });
      
      // Mostrar error visible al usuario (solo en debug)
      if (chatDebug) {
        alert("Crash: " + (err?.message ?? "unknown"));
      }
      
      if (optimisticMessage && optimisticMessage.clientMessageId) {
        try {
          await markMessageFailed(optimisticMessage.clientMessageId, err.message || "Error inesperado");
        } catch (cacheError) {
          console.warn("[handleSend] Error actualizando cache (error crítico):", cacheError);
        }
        
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMessageId === optimisticMessage!.clientMessageId
              ? { ...m, deliveryStatus: "failed" as const }
              : m
          )
        );
      }
    } finally {
      // SIEMPRE resetear sending, sin importar qué pasó
      chatDbg("handleSend finally", { BUILD_FINGERPRINT });
      setSending(false);
      
      // Resetear altura del textarea
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      inputRef.current?.focus();
    }
  };

  // Manejar selección de imagen
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que está online
    if (!isOnline) {
      alert("Se requiere conexión para enviar imágenes");
      return;
    }

    // Validar tipo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Solo se permiten imágenes JPG, PNG o WebP");
      return;
    }

    // Validar tamaño (8MB)
    if (file.size > 8 * 1024 * 1024) {
      alert("La imagen es demasiado grande. Máximo: 8MB");
      return;
    }

    // Crear preview
    const preview = URL.createObjectURL(file);
    const uploading: UploadingImage = {
      file,
      preview,
      status: "uploading",
    };

    setUploadingImages((prev) => [...prev, uploading]);

    try {
      // Subir archivo directamente (flujo simplificado)
      const clientMessageId = safeUuid();
      const clientCreatedAt = new Date().toISOString();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientMessageId", clientMessageId);
      formData.append("clientCreatedAt", clientCreatedAt);

      const uploadRes = await fetch(`/api/chat/threads/${threadId}/uploads`, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "Error subiendo imagen");
      }

      // Remover de uploading y agregar mensaje a la lista
      setUploadingImages((prev) => prev.filter((img) => img.preview !== preview));
      URL.revokeObjectURL(preview);

      // Agregar mensaje a la lista (optimistic)
      if (uploadData.message) {
        setMessages((prev) => [...prev, uploadData.message]);
      }

      // Refrescar mensajes para obtener el mensaje completo
      refreshMessages();
    } catch (error: any) {
      console.error("Error subiendo imagen:", error);
      setUploadingImages((prev) =>
        prev.map((img) =>
          img.preview === preview ? { ...img, status: "failed" } : img
        )
      );
      alert(error.message || "Error al subir imagen");
    }

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  // Determinar placeholder según estado
  const getPlaceholder = () => {
    if (userRole === "CLEANER") {
      return "Escribe para coordinar la limpieza...";
    }
    
    const isPending = threadStatus === "PENDING" || applicationStatus === "PENDING";
    if (isPending) {
      return "Escribe para responder al cleaner...";
    }
    
    return "Coordina horario, acceso o detalles...";
  };

  if (loading) {
    return <div className="text-center py-8 text-neutral-500">Cargando...</div>;
  }

  return (
    <>
      {/* Modal de imagen */}
      {selectedImage && (
        <ImageViewerModal
          assetId={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}

      <div className="flex flex-col h-full w-full bg-white overflow-hidden">
        {/* Build fingerprint visible en UI (solo si debug está activo) */}
        {chatDebug && (
          <div className="text-[10px] opacity-60 px-4 py-1 bg-yellow-50 border-b border-yellow-200">
            BUILD: {BUILD_FINGERPRINT}
          </div>
        )}
        
        {/* Mensajes - solo esta área hace scroll */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 overflow-x-hidden">
          {/* Botón cargar más */}
          {hasMore && !loading && (
            <div ref={messagesTopRef} className="flex justify-center py-2">
              <button
                onClick={loadMoreMessages}
                disabled={loadingMore}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? "Cargando..." : "Cargar mensajes anteriores"}
              </button>
            </div>
          )}
          {loadingMore && (
            <div className="text-center py-2 text-neutral-500 text-sm">
              Cargando mensajes anteriores...
            </div>
          )}
          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-neutral-600 mb-4 max-w-sm">
                Este chat se creó para coordinar esta limpieza.
                <br />
                Escribe un mensaje para iniciar la conversación.
              </p>
              <button
                onClick={() => inputRef.current?.focus()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Enviar primer mensaje
              </button>
            </div>
          )}
          
          {/* No renderizar mensajes hasta que viewerUserId esté definido (evitar flash) */}
          {!viewerUserId && !loading && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-neutral-600 text-sm">Cargando...</p>
            </div>
          )}
          
          {viewerUserId && messages.map((msg) => {
            // Usar viewerUserId estable (prop o estado) para calcular isOwn sin flash
            const isOwn = msg.senderUserId === viewerUserId;
            const isSystem = msg.type === "SYSTEM";
            // Key canónica: clientMessageId ?? serverId ?? id
            // Safety net: si tiene clientMessageId, combinar con serverId/id para evitar colisiones
            const keyBase = msg.clientMessageId ?? msg.serverId ?? msg.id;
            const messageKey = msg.clientMessageId 
              ? `${keyBase}:${msg.serverId ?? msg.id}` 
              : keyBase;
            
            // Mensajes SYSTEM se muestran centrados sin burbuja
            if (isSystem) {
              return (
                <div key={messageKey} className="flex justify-center my-2">
                  <p className="text-xs text-neutral-500 italic px-4 py-1 bg-neutral-50 rounded-full">
                    {msg.body}
                  </p>
                </div>
              );
            }
            
            return (
              <div
                key={messageKey}
                className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwn
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-100 text-neutral-900"
                  }`}
                >
                  {!isOwn && (
                    <div className="text-xs font-medium mb-1 opacity-70">
                      {msg.senderUser?.name || "Usuario"}
                    </div>
                  )}
                  {msg.type === "IMAGE" ? (
                    <ImageMessage
                      assetId={msg.asset?.id || ""}
                      publicUrl={msg.asset?.publicUrl}
                      onImageClick={() => setSelectedImage(msg.asset?.id || null)}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  )}
                  
                  {/* Etiquetas de debug técnica (solo si debug está activo) */}
                  {chatDebug && (
                    <div className="text-[8px] opacity-50 mt-1 space-y-0.5 border-t border-current pt-1">
                      <div>clientId: {msg.clientMessageId?.slice(0, 8) || "N/A"}</div>
                      <div>serverId: {msg.serverId?.slice(0, 8) || msg.id.slice(0, 8)}</div>
                      <div>status: {msg.deliveryStatus || "N/A"} / pending: {msg.isPending ? "true" : "false"}</div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs opacity-70">
                      {new Date(
                        msg.serverCreatedAt || msg.clientCreatedAt || new Date()
                      ).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {/* Indicadores de estado técnicos (solo si debug está activo) */}
                    {chatDebug && (msg.deliveryStatus === "sending" || msg.deliveryStatus === "pending" || msg.isPending) && (
                      <span className="text-xs opacity-70">⏳ Enviando</span>
                    )}
                    {/* Error siempre visible para el usuario */}
                    {msg.deliveryStatus === "failed" && (
                      <span className="text-xs text-red-600">❌ Falló</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
          
          {/* Imágenes subiendo - dentro del área de scroll */}
          {uploadingImages.length > 0 && (
            <div className="px-4 pb-2 space-y-2">
              {uploadingImages.map((img, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <img
                    src={img.preview}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    {img.status === "uploading" && (
                      <div className="text-sm text-neutral-600">Subiendo...</div>
                    )}
                    {img.status === "failed" && (
                      <div className="text-sm text-red-600">Falló</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input fijo en la parte inferior - siempre visible */}
        <div 
          className="border-t border-neutral-200 px-3 py-3 shrink-0 bg-white relative z-10"
          onKeyDown={(e) => {
            // Prevenir submit de form si hay alguno
            if (e.key === "Enter" && e.target === e.currentTarget) {
              e.preventDefault();
            }
          }}
        >
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          {/* Contenedor blanco grande que incluye el icono de imagen dentro */}
          <div className="flex-1 flex items-center gap-2 bg-white border border-neutral-200 rounded-2xl px-3 py-2.5 shadow-sm">
            <button
              type="button"
              onClick={() => {
                if (!isOnline) {
                  alert("Se requiere conexión para enviar imágenes");
                  return;
                }
                fileInputRef.current?.click();
              }}
              className="p-1.5 text-neutral-500 hover:text-neutral-700 active:bg-neutral-100 rounded-lg transition-colors shrink-0"
              title="Enviar imagen"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
            <textarea
              ref={inputRef}
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                // Auto-resize hasta 5 líneas
                const textarea = e.target;
                textarea.style.height = "auto";
                const scrollHeight = textarea.scrollHeight;
                const maxHeight = 5 * 24; // 5 líneas * 24px (line-height aproximado)
                textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
                textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
              }}
              onFocus={() => {
                // Scroll suave del área de mensajes al final cuando se enfoca el input
                // El scroll del body está bloqueado por ChatPageViewport
                setTimeout(() => {
                  scrollToBottom();
                }, 100);
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  chatDbg("ENTER -> handleSend");
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  await handleSend();
                }
              }}
              placeholder={getPlaceholder()}
              className="flex-1 bg-transparent border-0 focus:outline-none resize-none overflow-y-auto text-sm placeholder:text-neutral-400"
              rows={1}
              style={{ minHeight: "24px", maxHeight: "120px", lineHeight: "1.5" }}
            />
          </div>
          
          <button
            type="button"
            onPointerDown={(e) => {
              chatDbg("SEND pointerdown");
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={async (e) => {
              chatDbg("SEND click");
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              
              if (!messageText.trim() || sending || !senderUserId) {
                chatDbg("SEND click blocked", { 
                  hasText: !!messageText.trim(), 
                  sending, 
                  senderUserId 
                });
                return;
              }
              
              await handleSend();
            }}
            disabled={!messageText.trim() || sending || !senderUserId}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors shadow-sm"
            title="Enviar mensaje"
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
        </div>
      </div>
      
      {/* Debug Panel (solo si debug está activo) */}
      {chatDebug && <DebugPanel />}
    </>
  );
}

