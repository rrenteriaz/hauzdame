# Mensajes (Chat) — Contrato v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Contrato inicial  
**Alcance:** Sistema de mensajes/chat (Host y Cleaner)  

**Referencias:**
- `docs/debug/DIAGNOSTICO_MENSAJES_HILOS_FANTASMA.md`: Diagnóstico del bug de cache offline

---

## 1. Propósito y alcance

### 1.1 Qué regula este contrato

Este contrato establece las reglas canónicas para:

- **Fuente de verdad:** Qué datos se muestran y de dónde provienen (servidor vs cache offline)
- **Estados de conexión:** Comportamiento cuando la app está online vs offline
- **UX consistente:** Qué se muestra cuando no hay mensajes, cómo se representan datos cacheados, etiquetas válidas
- **Sincronización:** Cuándo el cache offline es válido y cuándo debe invalidarse
- **Multi-tenant:** Reglas para evitar mezclar datos entre tenants o usuarios

### 1.2 Qué NO regula

- Implementación interna detallada (cómo se implementa IndexedDB, cómo se detecta online/offline)
- Refactors de código o optimizaciones de performance
- Nuevas funcionalidades (p.ej., búsqueda, filtros avanzados)
- Diseño visual específico (colores, tamaños, espaciado)

---

## 2. Definiciones

### 2.1 Entidades

**Thread (Hilo de conversación):**
- Conversación entre participantes (Host ↔ Cleaner, Host ↔ Team, etc.)
- Identificado por `threadId` único
- Tiene `status`: `PENDING`, `ACTIVE`, `COMPLETED`, `CANCELLED` (enum `ChatThreadStatus`)
- Tiene `contextType`: `REQUEST`, `CLEANING` (enum `ChatThreadContextType`)
- Tiene `type`: `HOST_CLEANER`, `HOST_TEAM`, `TEAM_INTERNAL`, `HOST_HOST` (enum `ThreadType`)
- Tiene `lastMessageAt`: fecha del último mensaje (puede ser `null`)
- Tiene `property`: propiedad asociada (siempre presente, no puede ser `null`)
- Tiene `participants`: lista de participantes activos (`leftAt = null`)
- Tiene `tenantId`: ID del tenant al que pertenece el thread

**Message (Mensaje):**
- Mensaje individual dentro de un thread
- Tiene `body` (texto) o `asset` (imagen/archivo)
- Tiene `senderUser`: usuario que envió el mensaje
- Tiene `serverCreatedAt`: timestamp del servidor
- Puede tener `clientCreatedAt`: timestamp local (mensajes pendientes)

**Participant (Participante):**
- Usuario que forma parte de un thread
- Tiene `userId`: ID del usuario
- Tiene `role`: `OWNER`, `ADMIN`, `MEMBER`
- Tiene `leftAt`: fecha de salida (null si está activo)
- Puede tener `teamId` y `teamMembershipId` (para threads de Team)

### 2.2 Estados de conexión

**Online:**
- La app tiene conexión a internet
- Las llamadas al servidor pueden ejecutarse
- El servidor es la fuente de verdad autoritativa

**Offline:**
- La app NO tiene conexión a internet
- Las llamadas al servidor fallan o no se ejecutan
- El cache offline es la única fuente de datos disponible

**Transición offline→online:**
- Cambio de estado de `offline` a `online`
- Debe disparar sincronización con el servidor

### 2.3 Fuentes de datos

**Servidor (Server):**
- Base de datos PostgreSQL (tablas `ChatThread`, `ChatParticipant`, `ChatMessage`)
- Consultada vía `listThreadsForUser(userId)` en el servidor
- Retorna array de threads donde el usuario es participante activo
- Puede retornar `[]` si no hay threads (DB vacía o usuario sin threads)

**Cache offline (IndexedDB):**
- Base de datos local en el navegador (`hausdame_chat_v1`)
- Persiste threads y mensajes para uso offline
- Se actualiza cuando hay datos del servidor
- Puede contener datos antiguos si no se invalida correctamente

### 2.4 Estados de datos

**DB vacía:**
- Las tablas `ChatThread`, `ChatParticipant`, `ChatMessage` no tienen registros (0 rows)
- El servidor retorna `[]` para cualquier usuario
- NO debe confundirse con "usuario sin threads" (usuario puede no tener threads aunque la DB tenga datos)

**Sincronización pendiente:**
- El cache offline tiene datos que no coinciden con el servidor
- Puede ocurrir cuando:
  - El servidor tiene datos nuevos que no están en cache
  - El cache tiene datos antiguos que ya no existen en el servidor
  - Hay un desfase temporal entre cache y servidor

---

## 3. Fuente de verdad (MUST)

### 3.1 Tabla de escenarios

| Escenario | Servidor retorna | Estado conexión | Cache offline tiene | Fuente de verdad | UI muestra |
|-----------|-----------------|-----------------|---------------------|------------------|------------|
| **1. Online + DB con threads** | `[{thread1}, {thread2}]` | Online | `[{thread1}, {thread2}]` (actualizado) | **Servidor** | Threads del servidor |
| **2. Online + DB vacía** | `[]` | Online | `[{thread1}]` (antiguo) | **Servidor** | Estado vacío ("No tienes mensajes aún") |
| **3. Offline + Cache válido** | N/A (no se consulta) | Offline | `[{thread1}, {thread2}]` | **Cache offline** | Threads del cache + indicador "Sin conexión" |
| **4. Offline + Cache vacío** | N/A (no se consulta) | Offline | `[]` | **Cache offline** | Estado vacío ("No tienes mensajes aún") + indicador "Sin conexión" |
| **5. Transición offline→online** | `[{thread1}]` | Online (nuevo) | `[{thread1}, {thread2}]` (antiguo) | **Servidor** | Threads del servidor (sincroniza cache) |
| **6. Cambio de usuario/tenant** | `[]` o `[{thread1}]` | Online | `[{thread2}]` (de otro usuario) | **Servidor** | Threads del servidor (invalida cache anterior) |

### 3.2 Reglas MUST / MUST NOT

#### Regla 1: Online + servidor retorna threads
- **MUST:** Mostrar threads del servidor
- **MUST:** Actualizar cache offline con threads del servidor
- **MUST NOT:** Mostrar threads del cache si difieren del servidor

#### Regla 2: Online + servidor retorna []
- **MUST:** Mostrar estado vacío ("No tienes mensajes aún")
- **MUST:** Invalidar cache offline (limpiar o marcar como inválido)
- **MUST NOT:** Mostrar threads del cache aunque existan
- **MUST NOT:** Mostrar estado vacío con threads visibles

#### Regla 3: Offline
- **MAY:** Mostrar threads del cache offline si existen
- **MUST:** Mostrar indicador visual "Sin conexión" (banner, badge, etc.)
- **MUST:** Mostrar estado vacío si el cache está vacío
- **MUST NOT:** Intentar consultar al servidor

#### Regla 4: Transición offline→online
- **MUST:** Consultar servidor inmediatamente
- **MUST:** Reemplazar threads del cache con threads del servidor
- **MUST:** Actualizar cache offline con datos del servidor
- **MUST NOT:** Mantener threads antiguos del cache si el servidor retorna []

#### Regla 5: Cambio de usuario/tenant
- **MUST:** Invalidar cache offline completamente
- **MUST:** Consultar servidor con nuevo `viewerUserId`
- **MUST NOT:** Mostrar threads del usuario anterior
- **MUST NOT:** Mezclar threads de diferentes usuarios/tenants

---

## 4. Invariantes de UX

### 4.1 Estado vacío

**Cuándo mostrar:**
- Cuando `threads.length === 0` (ya sea del servidor o cache offline)

**Mensaje canónico:**
- Texto: "No tienes mensajes aún"
- Estilo: Centrado, texto neutral (`text-neutral-500`)
- Sin iconos adicionales (a menos que se defina en diseño)

**MUST NOT:**
- Mostrar estado vacío cuando hay threads visibles
- Mostrar mensajes diferentes ("No hay mensajes", "Sin conversaciones", etc.)

### 4.2 Etiquetas válidas

**Badge "Pendiente":**
- **Cuándo mostrar:** Cuando `thread.status === "PENDING"`
- **Significado:** El thread está en estado pendiente. Esto puede ocurrir cuando:
  - `contextType === "REQUEST"`: Solicitud de aplicación pendiente (aún no aceptada)
  - `contextType === "CLEANING"`: Thread asociado a una limpieza en estado pendiente
- **Estilo:** Badge amarillo (`bg-yellow-100 text-yellow-800`)
- **Ubicación:** Junto al nombre del participante en la lista de threads
- **Valores válidos de status:** `PENDING`, `ACTIVE`, `COMPLETED`, `CANCELLED` (según enum `ChatThreadStatus`)

**Badge "Sin conexión":**
- **Cuándo mostrar:** Cuando `isOnline === false`
- **Significado:** La app está offline y muestra datos del cache
- **Estilo:** Badge amarillo (`bg-yellow-100 text-yellow-800`)
- **Ubicación:** En el header de la página (arriba a la derecha)

**MUST NOT:**
- Mostrar badge "Pendiente" para threads con `status !== "PENDING"`
- Mostrar badge "Sin conexión" cuando `isOnline === true`
- Inventar nuevos badges sin definirlos en este contrato

### 4.3 Representación de datos cacheados

**Indicador visual obligatorio:**
- Cuando se muestran datos del cache offline, **MUST** mostrar badge "Sin conexión"
- El badge debe ser visible y claro (no oculto o sutil)

**Mensajes de estado:**
- Si hay threads del cache pero no hay conexión: mostrar threads + badge "Sin conexión"
- Si no hay threads del cache y no hay conexión: mostrar estado vacío + badge "Sin conexión"

**MUST NOT:**
- Mostrar threads del cache sin indicador de que son datos offline
- Mostrar datos del cache cuando estamos online y el servidor retorna []
- Mezclar threads del servidor con threads del cache sin indicar cuáles son cuáles

### 4.4 Invariantes críticos (MUST NOT BREAK)

**Nunca mostrar datos inconsistentes sin indicador:**
- Si el servidor retorna `[]` pero el cache tiene threads, **MUST NOT** mostrar threads del cache sin indicar que son datos offline
- Si cambia el usuario, **MUST NOT** mostrar threads del usuario anterior

**Nunca mezclar tenants:**
- Los threads del cache **MUST** pertenecer al mismo `viewerUserId` actual
- Si cambia el tenant o usuario, **MUST** invalidar cache anterior

**Nunca mostrar datos obsoletos como actuales:**
- Si el servidor tiene datos más recientes, **MUST** usar servidor
- Si el servidor retorna `[]`, **MUST** considerar cache inválido

---

## 5. Reglas de sincronización / invalidación

### 5.1 Cuándo invalidar cache

**Escenario 1: Online + servidor retorna []**
- **Acción:** Invalidar cache offline (limpiar o marcar como inválido)
- **Razón:** El servidor es la fuente de verdad; si retorna `[]`, no hay threads válidos

**Escenario 2: Cambio de `viewerUserId`**
- **Acción:** Invalidar cache offline completamente
- **Razón:** El cache pertenece a un usuario específico; no debe mostrarse para otro usuario

**Escenario 3: Cambio de tenant**
- **Acción:** Invalidar cache offline completamente
- **Razón:** Los threads pertenecen a un tenant específico; no debe mezclarse con otro tenant

**Escenario 4: Transición offline→online**
- **Acción:** Sincronizar cache con servidor (reemplazar cache con datos del servidor)
- **Razón:** El servidor tiene la verdad más reciente; el cache puede estar desactualizado

### 5.2 Cuándo actualizar cache

**Escenario 1: Online + servidor retorna threads**
- **Acción:** Guardar threads del servidor en cache offline
- **Razón:** Preparar cache para uso offline futuro

**Escenario 2: Nuevo mensaje recibido (realtime)**
- **Acción:** Actualizar thread correspondiente en cache
- **Razón:** Mantener cache sincronizado con cambios en tiempo real

### 5.3 Cuándo usar cache

**Escenario 1: Offline**
- **Acción:** Usar cache offline como única fuente de datos
- **Razón:** No hay conexión; el servidor no está disponible

**Escenario 2: Online + servidor retorna threads**
- **Acción:** Usar servidor (no cache)
- **Razón:** El servidor es la fuente de verdad cuando está disponible

**Escenario 3: Online + servidor retorna []**
- **Acción:** Usar servidor (mostrar estado vacío)
- **Razón:** El servidor indica que no hay threads; el cache debe invalidarse

---

## 6. Checklist de QA

### 6.1 Casos de prueba manuales

#### Caso 1: Online + DB con threads
- [ ] Cargar `/host/messages` con threads en DB
- [ ] Verificar que se muestran threads del servidor
- [ ] Verificar que NO aparece badge "Sin conexión"
- [ ] Verificar que el cache se actualiza con threads del servidor

#### Caso 2: Online + DB vacía
- [ ] Vaciar tablas `ChatThread`, `ChatParticipant`, `ChatMessage` en Prisma Studio
- [ ] Cargar `/host/messages`
- [ ] Verificar que se muestra "No tienes mensajes aún"
- [ ] Verificar que NO se muestran threads del cache (si existían)
- [ ] Verificar que el cache se invalida (IndexedDB vacío o marcado como inválido)

#### Caso 3: Offline + Cache válido
- [ ] Tener threads en cache offline (IndexedDB)
- [ ] Desconectar internet (DevTools → Network → Offline)
- [ ] Cargar `/host/messages`
- [ ] Verificar que se muestran threads del cache
- [ ] Verificar que aparece badge "Sin conexión"

#### Caso 4: Offline + Cache vacío
- [ ] Limpiar IndexedDB (`hausdame_chat_v1`)
- [ ] Desconectar internet
- [ ] Cargar `/host/messages`
- [ ] Verificar que se muestra "No tienes mensajes aún"
- [ ] Verificar que aparece badge "Sin conexión"

#### Caso 5: Transición offline→online
- [ ] Tener threads en cache offline
- [ ] Desconectar internet y cargar `/host/messages` (ver threads del cache)
- [ ] Reconectar internet
- [ ] Verificar que se consulta al servidor automáticamente
- [ ] Verificar que los threads se actualizan con datos del servidor
- [ ] Verificar que el badge "Sin conexión" desaparece

#### Caso 6: Cambio de usuario
- [ ] Cargar `/host/messages` con usuario A (tiene threads)
- [ ] Cerrar sesión y loguearse con usuario B (sin threads)
- [ ] Cargar `/host/messages`
- [ ] Verificar que NO se muestran threads del usuario A
- [ ] Verificar que se muestra estado vacío si usuario B no tiene threads

### 6.2 Matriz de escenarios

| Escenario | Online/Offline | DB tiene threads | Cache tiene threads | Resultado esperado |
|-----------|----------------|------------------|---------------------|-------------------|
| **A** | Online | Sí | Sí (actualizado) | Muestra threads del servidor |
| **B** | Online | Sí | Sí (desactualizado) | Muestra threads del servidor, actualiza cache |
| **C** | Online | No | Sí (antiguo) | Muestra estado vacío, invalida cache |
| **D** | Online | No | No | Muestra estado vacío |
| **E** | Offline | N/A | Sí | Muestra threads del cache + "Sin conexión" |
| **F** | Offline | N/A | No | Muestra estado vacío + "Sin conexión" |
| **G** | Offline→Online | Sí | Sí (antiguo) | Muestra threads del servidor, sincroniza cache |
| **H** | Offline→Online | No | Sí (antiguo) | Muestra estado vacío, invalida cache |

### 6.3 Verificaciones técnicas

#### Verificación 1: IndexedDB
- [ ] Abrir DevTools → Application → IndexedDB → `hausdame_chat_v1` → `threads`
- [ ] Verificar que los threads en cache tienen `threadId`, `snapshot`, `updatedAt`
- [ ] Verificar que `snapshot` contiene datos completos del thread

#### Verificación 2: Network requests
- [ ] Abrir Network tab en DevTools
- [ ] Cargar `/host/messages` (online)
- [ ] Verificar llamada a `/api/chat/threads`
- [ ] Verificar respuesta del servidor (`{ threads: [...] }` o `{ threads: [] }`)

#### Verificación 3: Logs del servidor
- [ ] Revisar logs de `listThreadsForUser` cuando se carga `/host/messages`
- [ ] Verificar que retorna `[]` cuando DB está vacía
- [ ] Verificar que retorna threads cuando DB tiene datos

#### Verificación 4: Validación de pertenencia del cache
- [ ] Cargar `/host/messages` con usuario A (tenant X)
- [ ] Verificar que threads en cache tienen `tenantId === tenant X`
- [ ] Verificar que threads en cache tienen `participants` que incluyen `userId === usuario A`
- [ ] Cambiar a usuario B (tenant Y)
- [ ] Verificar que NO se muestran threads del usuario A
- [ ] Verificar que el cache se invalida o filtra correctamente

---

## 7. Archivos clave

### 7.1 Páginas
- `app/host/messages/page.tsx`: Página servidor que obtiene threads iniciales
- `app/cleaner/messages/page.tsx`: Página servidor equivalente para Cleaner

### 7.2 Componentes
- `components/chat/MessagesInboxClient.tsx`: Componente cliente que renderiza la lista de threads
- `components/chat/ChatThreadView.tsx`: Componente que renderiza un thread individual

### 7.3 Helpers
- `lib/chat/auth.ts`: Función `listThreadsForUser` (fuente de verdad del servidor)
- `lib/offline/chatCache.ts`: Funciones de cache offline (`getCachedThreads`, `saveThreads`)
- `lib/offline/db.ts`: Configuración de IndexedDB (`hausdame_chat_v1`)

### 7.4 API Routes
- `app/api/chat/threads/route.ts`: Endpoint GET para obtener threads

---

## 8. Estado actual del repo (verificado)

### 9.1 Archivos existentes

**Páginas servidor:**
- ✅ `app/host/messages/page.tsx`: Existe y funciona
- ✅ `app/cleaner/messages/page.tsx`: Existe y funciona

**Componentes cliente:**
- ✅ `components/chat/MessagesInboxClient.tsx`: Existe y renderiza la lista de threads
- ✅ `components/chat/ChatThreadView.tsx`: Existe y renderiza un thread individual

**API Routes:**
- ✅ `app/api/chat/threads/route.ts`: Existe, endpoint GET que retorna `{ threads: [...] }`

**Helpers:**
- ✅ `lib/chat/auth.ts`: Función `listThreadsForUser` implementada
- ✅ `lib/offline/chatCache.ts`: Funciones de cache offline implementadas
- ✅ `lib/offline/db.ts`: Configuración de IndexedDB implementada

### 9.2 Schema de Prisma (valores reales)

**ChatThread.status (enum `ChatThreadStatus`):**
- `PENDING`: Thread en estado pendiente (default)
- `ACTIVE`: Thread activo
- `COMPLETED`: Thread completado
- `CANCELLED`: Thread cancelado

**ChatThread.contextType (enum `ChatThreadContextType`):**
- `REQUEST`: Thread asociado a una solicitud de aplicación
- `CLEANING`: Thread asociado a una limpieza

**ChatThread.type (enum `ThreadType`):**
- `HOST_CLEANER`: Thread entre Host y Cleaner individual (default)
- `HOST_TEAM`: Thread entre Host y Team
- `TEAM_INTERNAL`: Thread interno del Team
- `HOST_HOST`: Thread entre Hosts

---

## 9. Identidad/partición del cache (MUST)

### 10.1 Claves de identidad

**El cache offline DEBE identificar threads por las siguientes claves:**

1. **`viewerUserId` (implícito):**
   - El cache pertenece al usuario que lo creó
   - Los threads en cache DEBEN pertenecer a participantes donde `userId === viewerUserId`
   - Si cambia `viewerUserId`, el cache anterior NO es válido

2. **`tenantId` (explícito):**
   - Cada registro en cache tiene `tenantId` (campo directo en `ChatThread` de IndexedDB)
   - El `snapshot` del thread también contiene `tenantId`
   - Si cambia el tenant del usuario actual, el cache anterior NO es válido

3. **`threadId` (clave primaria):**
   - Identificador único del thread
   - Usado como clave primaria en IndexedDB (`threadId`)

### 10.2 Validación de pertenencia

**Al cargar cache, DEBE validar:**

1. **Verificar `tenantId`:**
   - Si `cachedThread.tenantId !== currentUserTenantId`, el thread NO es válido
   - **MUST:** Filtrar o eliminar threads con `tenantId` diferente

2. **Verificar `viewerUserId` en participants:**
   - Si el `snapshot` del thread tiene `participants`, verificar que existe un participante con `userId === viewerUserId`
   - Si NO existe tal participante, el thread NO es válido
   - **MUST:** Filtrar o eliminar threads donde el usuario actual no es participante

3. **Verificar `snapshot` completo:**
   - Si el `snapshot` no permite determinar pertenencia (falta `tenantId` o `participants`), tratar como inválido
   - **MUST:** Eliminar threads con `snapshot` incompleto o corrupto

### 10.3 Reglas MUST / MUST NOT

**MUST:**
- Validar `tenantId` del cache contra `tenantId` del usuario actual antes de mostrar threads
- Validar que el usuario actual es participante del thread antes de mostrarlo
- Invalidar cache completo si cambia `viewerUserId` o `tenantId`
- Eliminar threads del cache si su `snapshot` no permite validar pertenencia

**MUST NOT:**
- Mostrar threads del cache si `tenantId` no coincide con el usuario actual
- Mostrar threads del cache si el usuario actual no es participante
- Asumir que el cache es válido sin validar pertenencia
- Mezclar threads de diferentes tenants o usuarios en la misma sesión

### 10.4 Implementación recomendada (a nivel contrato)

**Al cargar cache:**
1. Obtener `viewerUserId` y `tenantId` del usuario actual
2. Cargar todos los threads del cache (`getCachedThreads()`)
3. Filtrar threads donde:
   - `cachedThread.tenantId === currentUserTenantId`
   - `cachedThread.snapshot.participants.some(p => p.userId === viewerUserId)`
4. Eliminar del cache los threads que no pasan la validación
5. Mostrar solo los threads válidos

**Al guardar cache:**
1. Guardar `tenantId` explícitamente en el registro de IndexedDB
2. Guardar `snapshot` completo del thread (incluye `tenantId` y `participants`)
3. No guardar threads si falta información de pertenencia

---

## 10. Referencias

- `docs/debug/DIAGNOSTICO_MENSAJES_HILOS_FANTASMA.md`: Diagnóstico completo del bug de cache offline que motivó este contrato
- `prisma/schema.prisma`: Modelos `ChatThread`, `ChatParticipant`, `ChatMessage`

---

**Versión:** 1.0  
**Fecha:** 2024  
**Mantenedor:** Equipo Hausdame

