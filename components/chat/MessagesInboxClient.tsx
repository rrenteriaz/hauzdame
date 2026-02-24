// components/chat/MessagesInboxClient.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useInboxRealtime } from "@/lib/chat/useInboxRealtime";
import { useNetworkStatus } from "@/lib/offline/useNetworkStatus";
import {
  getCachedThreads,
  saveThreads,
  clearCachedThreads,
  filterValidCachedThreads,
  checkAndInvalidateOnUserChange,
} from "@/lib/offline/chatCache";

interface Thread {
  id: string;
  tenantId?: string; // tenantId del thread (puede estar presente en el DTO del servidor)
  property: {
    id: string;
    name: string;
    shortName: string | null;
  };
  status: string;
  lastMessageAt: string | null;
  participants: Array<{
    user: {
      id: string;
      name: string | null;
      email: string;
      avatarMedia: {
        id: string;
        publicUrl: string | null;
      } | null;
    };
  }>;
  messages: Array<{
    body: string | null;
    senderUser: {
      id: string;
      name: string | null;
      avatarMedia: {
        id: string;
        publicUrl: string | null;
      } | null;
    };
  }>;
}

interface MessagesInboxClientProps {
  initialThreads: Thread[];
  basePath: "/host/messages" | "/cleaner/messages";
  viewerUserId?: string; // ID del usuario que está viendo la lista (para identificar contraparte)
}

export function MessagesInboxClient({
  initialThreads,
  basePath,
  viewerUserId,
}: MessagesInboxClientProps) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [loading, setLoading] = useState(false);
  const { isOnline } = useNetworkStatus();
  
  // useRef para rastrear el estado previo de isOnline (evitar fetch extra en primer mount)
  const prevIsOnlineRef = useRef<boolean | null>(null);

  // Obtener tenantId actual desde initialThreads (si están disponibles)
  // Referencia: MESSAGES_V1.md - Sección 9: Identidad/partición del cache
  // Si initialThreads está vacío, tenantId no está disponible (solo validación por viewerUserId)
  const currentTenantId =
    initialThreads.length > 0 && (initialThreads[0] as any).tenantId
      ? (initialThreads[0] as any).tenantId
      : null;

  // Invalidar cache si cambia viewerUserId (cambio de usuario)
  // Referencia: MESSAGES_V1.md - Regla 5: Cambio de usuario/tenant
  useEffect(() => {
    if (!viewerUserId) return;

    const handleUserChange = async () => {
      try {
        await checkAndInvalidateOnUserChange(viewerUserId);
      } catch (error) {
        console.error("Error verificando cambio de usuario:", error);
      }
    };

    handleUserChange();
  }, [viewerUserId]);

  // Inicialización según estado de conexión
  // Referencia: MESSAGES_V1.md - Sección 3: Fuente de verdad (MUST)
  useEffect(() => {
    const initializeThreads = async () => {
      if (isOnline) {
        // ONLINE: Servidor es la fuente de verdad
        // Regla 1: Online + servidor retorna threads -> usar servidor
        // Regla 2: Online + servidor retorna [] -> invalidar cache y mostrar estado vacío
        if (initialThreads.length === 0) {
          // Servidor retorna [] -> invalidar cache
          try {
            await clearCachedThreads();
          } catch (error) {
            console.error("Error limpiando cache:", error);
          }
          setThreads([]);
        } else {
          // Servidor retorna threads -> usar servidor y guardar en cache
          setThreads(initialThreads);
          try {
            // Guardar con viewerUserId para validación robusta
            // Si viewerUserId es undefined, NO guardar cache (silencioso)
            if (viewerUserId) {
              await saveThreads(initialThreads, { viewerUserId });
            }
          } catch (error) {
            console.error("Error guardando cache:", error);
          }
        }
      } else {
        // OFFLINE: Cache es la única fuente disponible
        // Regla 3: Offline -> usar cache con validación de pertenencia
        if (!viewerUserId) {
          // Sin viewerUserId, no podemos validar pertenencia -> mostrar estado vacío
          setThreads([]);
          return;
        }

        try {
          const cached = await getCachedThreads();
          if (cached.length > 0) {
            // Validar pertenencia antes de mostrar
            const validCached = filterValidCachedThreads(
              cached,
              viewerUserId,
              currentTenantId || undefined
            );
            const validThreads = validCached.map((c) => c.snapshot as Thread);
            setThreads(validThreads);
          } else {
            // Cache vacío -> mostrar estado vacío
            setThreads([]);
          }
        } catch (error) {
          console.error("Error cargando cache:", error);
          setThreads([]);
        }
      }
    };

    initializeThreads();
  }, [isOnline, initialThreads, viewerUserId, currentTenantId]);

  // Función para refrescar threads desde el servidor
  // Referencia: MESSAGES_V1.md - Regla 4: Transición offline→online
  // useCallback para estabilizar la referencia y evitar re-renders innecesarios
  const refreshThreads = useCallback(async () => {
    if (!isOnline) {
      return; // No intentar si está offline
    }

    try {
      setLoading(true);
      const res = await fetch("/api/chat/threads");
      const data = await res.json();
      const newThreads = data.threads || [];

      if (newThreads.length === 0) {
        // Servidor retorna [] -> invalidar cache
        await clearCachedThreads();
        setThreads([]);
      } else {
        // Servidor retorna threads -> usar servidor y guardar en cache
        setThreads(newThreads);
        // Guardar con viewerUserId para validación robusta
        // Si viewerUserId es undefined, NO guardar cache (silencioso)
        if (viewerUserId) {
          await saveThreads(newThreads, { viewerUserId });
        }
      }
    } catch (error) {
      console.error("Error refrescando threads:", error);
    } finally {
      setLoading(false);
    }
  }, [isOnline, viewerUserId]);

  // Refrescar SOLO cuando hay transición real OFFLINE→ONLINE
  // Referencia: MESSAGES_V1.md - Regla 4: Transición offline→online
  // Evita fetch extra en primer mount cuando ya tenemos initialThreads del servidor
  useEffect(() => {
    const prevIsOnline = prevIsOnlineRef.current;
    
    // Solo ejecutar refresh si hay transición OFFLINE → ONLINE
    // No ejecutar si:
    // - Es el primer mount (prevIsOnline === null) y ya estamos online
    // - Ya estábamos online (prevIsOnline === true)
    if (prevIsOnline === false && isOnline === true) {
      // Transición real OFFLINE → ONLINE -> consultar servidor inmediatamente
      refreshThreads();
    }
    
    // Actualizar ref al final del effect
    prevIsOnlineRef.current = isOnline;
  }, [isOnline, refreshThreads]);

  // Suscripción a realtime para todos los threads visibles
  useInboxRealtime({
    threadIds: threads.map((t) => t.id),
    onAnyNewMessage: refreshThreads,
    enabled: threads.length > 0,
    debounceMs: 500,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mensajes</h1>
        {!isOnline && (
          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
            Sin conexión
          </span>
        )}
      </div>

      {threads.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <p>No tienes mensajes aún</p>
        </div>
      ) : (
        <div className="relative">
          {/* Spinner overlay - no desplaza elementos */}
          {loading && (
            <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2">
              <div className="flex items-center justify-center rounded-full bg-white/80 px-3 py-2 shadow-sm backdrop-blur-sm">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
              </div>
            </div>
          )}
          
          {threads.map((thread, index) => {
            const lastMessage = thread.messages[0];
            // Obtener el otro participante (contraparte del viewer)
            // Si viewerUserId está disponible, filtrar para obtener la contraparte
            const counterpartParticipant = viewerUserId
              ? thread.participants.find((p) => p.user?.id && p.user.id !== viewerUserId)
              : thread.participants[0];
            const otherParticipant = counterpartParticipant?.user;
            const participantName = otherParticipant?.name || otherParticipant?.email || "Usuario";
            const participantAvatar = otherParticipant?.avatarMedia?.publicUrl;

            return (
              <Link
                key={thread.id}
                href={`${basePath}/${thread.id}`}
                className="block"
              >
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors">
                  {/* Avatar */}
                  <div className="h-12 w-12 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-semibold text-neutral-600 shrink-0">
                    {participantAvatar ? (
                      <img
                        src={participantAvatar}
                        alt={participantName}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      participantName.charAt(0).toUpperCase()
                    )}
                  </div>
                  
                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-neutral-900 truncate">
                        {participantName}
                      </h3>
                      {thread.status === "PENDING" && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded shrink-0">
                          Pendiente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 truncate">
                      {thread.property?.name || "Alojamiento"}
                    </p>
                    {lastMessage ? (
                      <p className="text-sm text-neutral-600 truncate mt-1">
                        {lastMessage.body || "[Imagen]"}
                      </p>
                    ) : (
                      <p className="text-sm text-neutral-500 italic truncate mt-1">
                        {thread.status === "PENDING"
                          ? "Solicitud pendiente"
                          : thread.status === "ACTIVE"
                          ? "Solicitud aceptada"
                          : "Limpieza"}
                      </p>
                    )}
                  </div>
                  
                  {/* Fecha */}
                  {thread.lastMessageAt && (
                    <span className="text-xs text-neutral-400 shrink-0">
                      {new Date(thread.lastMessageAt).toLocaleDateString("es-MX", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
                {/* Separador */}
                {index < threads.length - 1 && (
                  <div className="border-b border-neutral-100 mx-4" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

