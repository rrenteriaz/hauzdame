# OFFLINE CHAT - RESUMEN DE IMPLEMENTACIÓN

## ✅ CAMBIOS IMPLEMENTADOS

### 1. IndexedDB Layer
- ✅ `lib/offline/db.ts`
  - Schema con 4 object stores: threads, messages, outbox, meta
  - Índices para búsquedas eficientes
  - Singleton pattern para conexión DB

### 2. Cache de Chat
- ✅ `lib/offline/chatCache.ts`
  - `saveThreads()` - Guardar threads en cache
  - `getCachedThreads()` - Obtener threads cacheados (ordenados por lastMessageAt)
  - `saveMessages()` - Guardar mensajes en cache
  - `getCachedMessages()` - Obtener mensajes cacheados (con filtros)
  - `upsertPendingMessage()` - Agregar/actualizar mensaje pendiente
  - `markMessageSent()` - Marcar mensaje como enviado
  - `markMessageFailed()` - Marcar mensaje como fallido
  - `purgeOldMessages()` - Purga mensajes > 15 días

### 3. Outbox
- ✅ `lib/offline/outbox.ts`
  - `enqueueMessage()` - Agregar mensaje a cola
  - `getPendingOutbox()` - Obtener mensajes listos para reintentar
  - `updateAttempt()` - Actualizar intentos y próximo retry
  - `removeFromOutbox()` - Remover mensaje enviado
  - `calculateNextRetry()` - Backoff exponencial con jitter

### 4. Sync Engine
- ✅ `lib/offline/sync.ts`
  - `syncOutboxOnce()` - Sincronizar batch de mensajes
  - `startSyncLoop()` - Loop cada 5 segundos + evento "online"
  - `stopSyncLoop()` - Detener loop
  - Retry con backoff: 2s, 4s, 8s... hasta 60s max
  - Máximo 8 intentos antes de marcar como fallido

### 5. Network Status
- ✅ `lib/offline/useNetworkStatus.ts`
  - Hook para detectar estado de conexión
  - Listener de eventos "online"/"offline"

### 6. Inicialización
- ✅ `lib/offline/init.ts`
  - Purga mensajes antiguos al iniciar
  - Inicia sync loop si está online
- ✅ `components/offline/OfflineInit.tsx`
  - Componente que inicializa sistema offline
  - Integrado en layouts de Host y Cleaner

### 7. Integración en UI

#### MessagesInboxClient
- ✅ Carga cache al montar (pinta rápido)
- ✅ Refresca desde servidor si está online
- ✅ Badge "Sin conexión" cuando offline
- ✅ Guarda threads en cache después de fetch

#### ChatThreadView
- ✅ Carga cache al montar
- ✅ Refresca desde servidor si está online
- ✅ Guarda mensajes en cache
- ✅ Envío offline:
  - Guarda en cache y outbox inmediatamente
  - Muestra estado "Pendiente" en UI
  - Intenta enviar si está online
  - Si falla, queda en outbox para sync
- ✅ Estados de delivery:
  - "Pendiente" (⏳) - En cola
  - "Falló" (❌) - Después de 8 intentos
  - Sin badge - Enviado exitosamente
- ✅ Inicia sync loop al montar
- ✅ Badge "Sin conexión" en input

## 🔒 CARACTERÍSTICAS

### Idempotencia
- ✅ Usa `clientMessageId` (UUID) para evitar duplicados
- ✅ Server valida idempotencia por `(threadId, clientMessageId)`
- ✅ Si mensaje ya existe, actualiza con datos del servidor

### Cache
- ✅ Threads: sin límite de tiempo
- ✅ Mensajes: máximo 15 días (purga automática)
- ✅ Purga al iniciar app y 1 vez al día

### Sync
- ✅ Loop cada 5 segundos cuando está online
- ✅ También sincroniza al detectar reconexión (evento "online")
- ✅ Backoff exponencial: 2s → 4s → 8s → 16s → 32s → 60s (max)
- ✅ Jitter aleatorio (0-500ms) para evitar thundering herd
- ✅ Máximo 10 mensajes por batch

### Restricciones
- ✅ Solo texto offline
- ✅ Imágenes requieren conexión (mostrar aviso si se intenta offline)

## 🧪 CÓMO PROBAR MANUALMENTE

### Prerequisitos
1. Chrome DevTools abierto
2. Dos sesiones (Host y Cleaner) en navegadores diferentes

### Prueba 1: Cache de Inbox
1. **Con conexión:**
   - Login y abrir `/host/messages` o `/cleaner/messages`
   - Verificar que carga threads

2. **Sin conexión:**
   - En Chrome DevTools: Network → Throttling → Offline
   - Recargar página
   - **Resultado esperado:** Inbox muestra threads desde cache

### Prueba 2: Cache de Mensajes
1. **Con conexión:**
   - Abrir un thread
   - Verificar que carga mensajes

2. **Sin conexión:**
   - Activar Offline en DevTools
   - Recargar página
   - **Resultado esperado:** Thread muestra mensajes desde cache

### Prueba 3: Envío Offline
1. **Preparación:**
   - Abrir thread en Sesión A
   - Activar Offline en DevTools

2. **Enviar mensaje:**
   - Escribir y enviar mensaje de texto
   - **Resultado esperado:**
     - Mensaje aparece inmediatamente con badge "⏳ Pendiente"
     - Toast/alert: "Mensaje guardado. Se enviará al reconectar."

3. **Verificar outbox:**
   - En DevTools: Application → IndexedDB → hausdame_chat_v1 → outbox
   - **Resultado esperado:** Ver mensaje en outbox

### Prueba 4: Reconexión y Sync
1. **Preparación:**
   - Tener mensaje pendiente en outbox (Prueba 3)

2. **Reconectar:**
   - En DevTools: Network → Throttling → Online
   - Esperar máximo 5 segundos

3. **Verificar:**
   - **Resultado esperado:**
     - Mensaje desaparece de outbox
     - Badge "Pendiente" desaparece en UI
     - Mensaje aparece en Sesión B (si está abierta)

### Prueba 5: Sin Duplicados
1. **Enviar mensaje offline**
2. **Reconectar** (sync envía)
3. **Recargar página**
4. **Resultado esperado:** Mensaje aparece solo una vez (no duplicado)

### Prueba 6: Retry con Backoff
1. **Simular error:**
   - Enviar mensaje offline
   - Antes de reconectar, modificar endpoint para retornar error 500
   - Reconectar

2. **Verificar:**
   - En DevTools: Application → IndexedDB → outbox
   - **Resultado esperado:**
     - `attempts` incrementa
     - `nextRetryAt` aumenta con backoff
     - Después de 8 intentos, se marca como "failed"

### Prueba 7: Purga de Mensajes
1. **Crear mensaje antiguo:**
   - En DevTools: Application → IndexedDB → messages
   - Editar `serverCreatedAt` a hace 20 días

2. **Recargar app:**
   - **Resultado esperado:** Mensaje antiguo se purga (solo si `deliveryStatus === "sent"`)

### Prueba 8: Imágenes Offline
1. **Activar Offline**
2. **Intentar enviar imagen:**
   - (Cuando se implemente selector de imágenes)
   - **Resultado esperado:** Bloquear acción y mostrar: "Se requiere conexión para enviar imágenes"

## ⚠️ NOTAS IMPORTANTES

### IndexedDB
- DB name: `hausdame_chat_v1`
- Version: 1
- Stores: threads, messages, outbox, meta

### Sync Loop
- Se inicia automáticamente al montar `ChatThreadView`
- Se detiene al desmontar
- También se inicia en `initOffline()` si está online

### Estados de Delivery
- `pending`: En outbox, esperando envío
- `sent`: Enviado exitosamente
- `failed`: Falló después de 8 intentos

### Backoff
- Base: 2 segundos
- Máximo: 60 segundos
- Jitter: 0-500ms aleatorio
- Fórmula: `min(2^attempts * 2000, 60000) + random(0-500)`

### Purga
- Solo purga mensajes con `deliveryStatus === "sent"`
- Mensajes pendientes/fallidos NO se purgan automáticamente
- Intervalo: 1 vez al día

## 🚀 PRÓXIMOS PASOS (OPCIONAL)

1. **Botón Reintentar:**
   - Agregar botón "Reintentar" en mensajes fallidos
   - Re-enqueue en outbox con `attempts = 0`

2. **Background Sync API:**
   - Usar Service Worker para sync en background
   - Mejor experiencia cuando app está cerrada

3. **Indicador de Progreso:**
   - Mostrar "Sincronizando X mensajes..." durante sync

4. **Optimización de Cache:**
   - Comprimir mensajes antiguos
   - Límite de tamaño total de cache

