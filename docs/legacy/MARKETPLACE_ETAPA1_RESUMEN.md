# MARKETPLACE CLEANERS + CHAT - ETAPA 1 - RESUMEN DE IMPLEMENTACIÓN

## ✅ REFINAMIENTO UX MENSAJES — INBOX HUMANO Y CHAT LIMPIO (COMPLETADO)

### Refinamiento visual e interacción (Airbnb-like)
- ✅ **Inbox centrado en personas**: Muestra avatar y nombre de la persona como título principal, alojamiento como subtítulo discreto
- ✅ **Lista flat y aireada**: Sin tarjetas con bordes, solo separadores sutiles entre items
- ✅ **Header simplificado**: Solo flecha de regreso, nombre de persona (título) y alojamiento (subtítulo pequeño)
- ✅ **Zona de mensajes limpia**: Sin bordes ni contenedores tipo card, solo burbujas de mensajes
- ✅ **Scroll optimizado**: Solo el historial de mensajes tiene scroll, header e input permanecen fijos
- ✅ **Input moderno**: Textarea que crece automáticamente hasta 5 líneas, luego scroll interno; botones con iconos
- ✅ **Sin mensajes técnicos**: Comportamiento offline silencioso, sin textos técnicos visibles al usuario

### Archivos modificados
- `app/api/chat/threads/route.ts` - Incluye avatarMedia en participantes y senderUser
- `components/chat/MessagesInboxClient.tsx` - Inbox centrado en personas con avatares
- `app/host/messages/[threadId]/page.tsx` - Header simplificado y layout fijo
- `app/cleaner/messages/[threadId]/page.tsx` - Header simplificado y layout fijo
- `components/chat/ChatThreadView.tsx` - UI limpia, scroll optimizado, input moderno

---

## ✅ ETAPA 1.5 — MEJORAS UX MENSAJES (COMPLETADO)

### Mejoras de UX implementadas (Airbnb-like)
- ✅ **Mensaje inicial automático**: Cuando un Cleaner aplica, se crea automáticamente un mensaje TEXT (no SYSTEM) con contenido humano: "Hola 👋, me interesa la limpieza de esta propiedad. Quedo atento para coordinar detalles."
- ✅ **Header del chat con contexto**: Muestra estado del flujo (🟡 Solicitud pendiente / 🟢 Solicitud aceptada) y texto guía según el estado
- ✅ **Input con placeholder inteligente**: Cambia según el estado y rol del usuario:
  - Host (pendiente): "Escribe para responder al cleaner..."
  - Host (aceptada): "Coordina horario, acceso o detalles..."
  - Cleaner: "Escribe para coordinar la limpieza..."
- ✅ **Empty state del chat**: Muestra mensaje guía y botón "Enviar primer mensaje" cuando no hay mensajes visibles
- ✅ **Inbox contextual**: Cada thread muestra contexto cuando no hay mensajes:
  - "Solicitud pendiente · Limpieza"
  - "Solicitud aceptada · Limpieza"
- ✅ **Feedback visual mejorado**: Animación fade/slide al enviar mensaje y scroll inmediato al nuevo mensaje

### Archivos modificados
- `app/api/applications/route.ts` - Crea mensaje inicial automático al aplicar
- `app/host/messages/[threadId]/page.tsx` - Header con estado y guía
- `app/cleaner/messages/[threadId]/page.tsx` - Header con estado y guía
- `components/chat/ChatThreadView.tsx` - Placeholder inteligente, empty state, feedback visual
- `components/chat/MessagesInboxClient.tsx` - Contexto mejorado en inbox

---

## ✅ COMPLETADO

### 1. Modelos Prisma
- ✅ `PropertyOpening` - Bandera de trabajo por propiedad
- ✅ `PropertyApplication` - Solicitud de Cleaner a opening
- ✅ `ChatThread` - Hilo de conversación
- ✅ `ChatParticipant` - Participantes del thread
- ✅ `ChatMessage` - Mensajes con soporte TEXT e IMAGE
- ✅ Enums: `PropertyOpeningStatus`, `WorkType`, `PropertyApplicationStatus`, `ChatThreadContextType`, `ChatThreadStatus`, `ChatMessageType`
- ✅ Relaciones agregadas en Tenant, Property, User, Cleaning, Asset

### 2. Route Handlers / API
- ✅ `POST /api/openings` - Crear opening
- ✅ `PATCH /api/openings` - Pausar/cerrar opening
- ✅ `POST /api/applications` - Aplicar a opening (crea application + thread)
- ✅ `PATCH /api/applications` - Aceptar/rechazar solicitud
- ✅ `GET /api/chat/threads` - Inbox (lista de threads)
- ✅ `GET /api/chat/threads/[threadId]/messages` - Mensajes paginados
- ✅ `POST /api/chat/threads/[threadId]/messages` - Enviar mensaje (idempotente)

### 3. Realtime
- ✅ `lib/realtime/chat.ts` - Utilidad para emitir broadcast vía Supabase (server-side)
- ✅ Integrado en POST de mensajes
- ✅ **Realtime Client-Side (COMPLETADO)**:
  - ✅ `lib/supabase/client.ts` - Cliente Supabase para navegador (singleton)
  - ✅ `lib/chat/useThreadRealtime.ts` - Hook para suscripción a thread específico
  - ✅ `lib/chat/useInboxRealtime.ts` - Hook para suscripción global del inbox (debounce)
  - ✅ `lib/chat/mergeMessages.ts` - Helper para merge sin duplicados
  - ✅ Integrado en `ChatThreadView` - Actualización automática de mensajes
  - ✅ Integrado en `MessagesInboxClient` - Actualización automática del inbox

### 4. Navegación
- ✅ Host: Agregado icono "Mensajes" en `HostBottomNav`
- ✅ Cleaner: Agregado "Mensajes" en layout (grid-cols-4, desktop nav)

### 5. Páginas UI
- ✅ `app/host/messages/page.tsx` - Inbox de Host
- ✅ `app/host/messages/[threadId]/page.tsx` - Thread view de Host
- ✅ `app/cleaner/messages/page.tsx` - Inbox de Cleaner
- ✅ `app/cleaner/messages/[threadId]/page.tsx` - Thread view de Cleaner
- ✅ `components/chat/ChatThreadView.tsx` - Componente de chat reutilizable

## ✅ AUTENTICACIÓN REAL (COMPLETADO)

### 1. Autenticación Real
- ✅ **COMPLETADO**: Sistema de autenticación con sesiones seguras implementado
- ✅ Login unificado (email + contraseña) - `/app/login`
- ✅ Sesiones seguras (cookies httpOnly/secure/sameSite)
- ✅ Rate limiting para login (10 intentos / 15 min)
- ✅ Validación de permisos en todos los endpoints
- ✅ Middleware protege rutas `/host/**` y `/cleaner/**`
- ✅ Todos los endpoints refactorizados para usar `requireUser()` en lugar de `userId` del cliente
- ✅ Guards de permisos: `canAccessProperty`, `canAccessThread`, `canManageOpening`, `canApplyToOpening`, `canManageApplication`
- ✅ Multi-tenant: validación de `tenantId` en todos los endpoints
- ✅ Redirección post-login por rol: CLEANER → `/cleaner`, otros roles → `/host`

**Archivos creados:**
- `lib/auth/password.ts` - Hash y verificación de contraseñas (bcrypt)
- `lib/auth/session.ts` - Gestión de sesiones con cookies
- `lib/auth/requireUser.ts` - Helpers para requerir usuario autenticado
- `lib/auth/guards.ts` - Validaciones de permisos
- `lib/auth/rateLimit.ts` - Rate limiting en memoria
- `app/login/page.tsx` - Página de login
- `app/api/auth/login/route.ts` - Endpoint de login
- `app/api/auth/logout/route.ts` - Endpoint de logout
- `app/api/auth/me/route.ts` - Obtener usuario actual
- `middleware.ts` - Protección de rutas

## ⚠️ PENDIENTE / INCOMPLETO

### 2. Marketplace UI (Openings y Applications) ✅ COMPLETADO
- ✅ **Fix**: Solicitudes ahora se listan correctamente por propiedad (filtro por propertyId, no depende del opening)
- ✅ `/cleaner/marketplace/page.tsx` - Página para ver openings disponibles
- ✅ `components/properties/PropertyOpeningManager.tsx` - Componente para crear/pausar/cerrar opening
- ✅ `/host/properties/[id]/applications/page.tsx` - Página para ver aplicaciones por propiedad
- ✅ Botón "Solicitar" en marketplace (Cleaner)
- ✅ Integración "Busco Cleaner" en vista de propiedad (Host)
- ✅ Navegación actualizada: Marketplace agregado en layout de Cleaner

### 3. Offline (IndexedDB) ✅ COMPLETADO
- ✅ `lib/offline/db.ts` - Schema IndexedDB (threads, messages, outbox, meta)
- ✅ `lib/offline/chatCache.ts` - Cache de threads y mensajes (15 días, purga automática)
- ✅ `lib/offline/outbox.ts` - Cola de mensajes pendientes con retry
- ✅ `lib/offline/sync.ts` - Sync engine con backoff exponencial (2s → 60s max, 8 intentos)
- ✅ `lib/offline/useNetworkStatus.ts` - Hook para detectar conexión
- ✅ `lib/offline/init.ts` - Inicialización y purga automática
- ✅ Integrado en `MessagesInboxClient` - Carga cache primero, luego sync si online
- ✅ Integrado en `ChatThreadView` - Envío offline, estados de delivery (⏳ Pendiente, ❌ Falló)
- ✅ `components/offline/OfflineInit.tsx` - Inicialización en layouts (Host y Cleaner)
- ✅ Restricción: imágenes requieren conexión (mostrar aviso)

### 4. Imágenes en Chat ✅ COMPLETADO
- ✅ `POST /api/chat/threads/[threadId]/uploads` - Subir imagen directamente
- ✅ `GET /api/assets/[assetId]/signed` - Obtener signed URL para visualizar
- ✅ Validación de permisos, tipo MIME y tamaño (8MB max)
- ✅ Validación offline (no permite subir sin conexión)
- ✅ `components/chat/ImageMessage.tsx` - Render de mensajes tipo IMAGE
- ✅ `components/chat/ImageViewerModal.tsx` - Modal para ver imagen grande
- ✅ Integrado en `ChatThreadView` - Botón imagen, preview, estados de upload
- ✅ Realtime: mensajes IMAGE se emiten automáticamente
- ✅ Signed URLs con expiración (30 min) para assets privados
- ✅ Ver `CHAT_IMAGES_IMPLEMENTACION.md` para detalles

### 5. Owner Card Público ✅ COMPLETADO
- ✅ `components/marketplace/OwnerCardPublic.tsx` - Componente con privacidad estricta
- ✅ `GET /api/tenants/[tenantId]/public` - Endpoint público (sin datos privados)
- ✅ Integrado en:
  - Marketplace de Cleaner (listado de openings)
  - Header del chat (Host y Cleaner)
- ✅ Muestra solo: nombre comercial, rating (fallback "Nuevo"), miembro desde, cantidad de alojamientos
- ✅ NO muestra: teléfono, correo, dirección, lista de propiedades


### 6. Realtime Client-Side
- ⚠️ **FALTA**: Suscripción a Supabase Realtime en `ChatThreadView`
- ⚠️ **FALTA**: Actualización automática cuando llegan mensajes nuevos
- ⚠️ **FALTA**: Manejo de reconexión

### 7. Validaciones y Permisos
- ⚠️ **FALTA**: Validar que usuario es Owner/Admin/Auxiliar para crear opening
- ⚠️ **FALTA**: Validar que usuario es Cleaner para aplicar
- ⚠️ **FALTA**: Validar que usuario es participante del thread para enviar mensajes
- ⚠️ **FALTA**: Validar que opening está ACTIVE antes de aplicar

### 8. Migración Prisma
- ⚠️ **FALTA**: Ejecutar `npx prisma migrate dev --name add_marketplace_chat`
- ⚠️ **FALTA**: Ejecutar `npx prisma generate`

### 9. Configuración Supabase
- ⚠️ **FALTA**: Verificar que Supabase Realtime está habilitado
- ⚠️ **FALTA**: Configurar variables de entorno: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## 🔒 HARDENING COMPLETADO (CIERRE ETAPA 1)

### Paginación Real de Mensajes ✅
- ✅ Cursor-based pagination (serverCreatedAt)
- ✅ Limit default 30, máximo 100
- ✅ UI: Botón "Cargar mensajes anteriores"
- ✅ Scroll estable (no salta al cargar)
- ✅ Compatible con cache offline

### Rate Limiting ✅
- ✅ Mensajes: 20 / minuto / thread
- ✅ Uploads: 10 imágenes / 5 minutos / user
- ✅ Respuesta 429 con mensaje claro
- ✅ UI no reintenta automáticamente

### Openings - Garantía 1 ACTIVE ✅
- ✅ Transacción para evitar race conditions
- ✅ Verificación dentro de transacción
- ✅ Error claro si ya existe ACTIVE
- ✅ Nunca pueden existir dos ACTIVE simultáneas

### Hardening de Uploads ✅
- ✅ Validación MIME real (magic bytes)
- ✅ Sanitización de filename (UUID + ext segura)
- ✅ Rate limit (10 / 5 min)
- ✅ Validación estricta de tamaño (8MB)

### Robustez Sync Offline ✅
- ✅ Límite de intentos (8 max)
- ✅ Logging controlado (solo dev)
- ✅ Marcar FAILED definitivo tras 8 intentos
- ✅ Reconciliación segura tras sync

### Auditoría de Permisos ✅
- ✅ Todos los endpoints usan requireUser()
- ✅ Validación explícita de acceso
- ✅ Nunca confían en tenantId del cliente
- ✅ Errores 403 claros

### QA Checklist ✅
- ✅ `QA_ETAPA1_CHECKLIST.md` creado
- ✅ 12 casos de prueba documentados
- ✅ Criterios de aceptación definidos

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### Autenticación Temporal
Actualmente, los endpoints esperan `userId` en el body o query params. Esto es **temporal** y debe reemplazarse con autenticación real antes de producción.

### Realtime
La implementación actual usa Supabase Broadcast controlado por servidor. El cliente aún no se suscribe; los mensajes se cargan al abrir el thread.

### Offline
✅ **COMPLETADO**: Sistema offline implementado con IndexedDB:
- Cache de threads y mensajes (15 días)
- Outbox para mensajes offline
- Sync automático con retry y backoff
- Estados de delivery en UI
- Ver `OFFLINE_CHAT_IMPLEMENTACION.md` para detalles

### Marketplace
Las páginas para crear/ver openings y applications aún no están creadas. Solo están los endpoints API.

## 🚀 PRÓXIMOS PASOS RECOMENDADOS

1. **Autenticación** (Prioridad Alta)
   - Implementar login unificado
   - Reemplazar `userId` temporal en todos los endpoints
   - Agregar validación de permisos

2. **Migración Prisma** (Prioridad Alta)
   - Ejecutar migración
   - Verificar que no hay errores

3. **Marketplace UI** (Prioridad Media)
   - Crear página de openings disponibles (Cleaner)
   - Agregar toggle "Busco Cleaner" en property detail (Host)
   - Crear página de aplicaciones (Host)

4. **Realtime Client** (Prioridad Media)
   - Suscribirse a Supabase Realtime en ChatThreadView
   - Actualizar mensajes automáticamente

5. **Offline** (Prioridad Baja)
   - Implementar IndexedDB cache
   - Implementar outbox
   - Agregar reconciliación

6. **Owner Card** (Prioridad Baja)
   - Crear componente
   - Integrar en vistas relevantes

