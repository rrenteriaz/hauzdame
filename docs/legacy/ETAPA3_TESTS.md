# ETAPA 3 — TESTS DE SEGURIDAD (Chat blindado por Participants)

**Fecha:** 2025-01-24  
**Objetivo:** Validar que el acceso a threads depende SOLO de `ThreadParticipant` activo, no de `tenantId`/`propertyId`.

---

## ✅ REVISIÓN PRELIMINAR DEL CÓDIGO (Code Review)

**Status:** Build verde ✅ — Código listo para tests manuales.

### Validaciones implementadas:

#### 1. ✅ `requireChatParticipant` se llama antes de:
- **Leer thread:** `app/host/messages/[threadId]/page.tsx` (línea 27), `app/cleaner/messages/[threadId]/page.tsx` (línea 27)
- **Leer messages:** `app/api/chat/threads/[threadId]/messages/route.ts` (línea 30, GET)
- **Enviar messages:** `app/api/chat/threads/[threadId]/messages/route.ts` (línea 143, POST)
- **Uploads:** `app/api/chat/threads/[threadId]/uploads/route.ts` (línea 29)
- **Team members:** `app/api/chat/threads/[threadId]/team-members/route.ts` (línea 22)
- **Agregar/remover participants:** `lib/chat/auth.ts` → `addThreadParticipant` (línea 449), `removeThreadParticipant` (línea 633)

#### 2. ✅ `listThreadsForUser` NO filtra por `tenantId`:
- **Código:** `lib/chat/auth.ts` (líneas 84-172)
- **Query:** `where: { id: { in: threadIds } }` — solo filtra por `threadIds` obtenidos de `ChatParticipant` con `leftAt: null`
- **Uso:** `app/host/messages/page.tsx` (línea 15), `app/cleaner/messages/page.tsx` (línea 15), `app/api/chat/threads/route.ts` (línea 17)

#### 3. ✅ `ManageThreadMembers` solo se muestra si:
- **Código:** `components/chat/ManageThreadMembers.tsx` (línea 33)
- **Condición:** `threadType === "HOST_TEAM" && viewerParticipantRole === "OWNER"`
- **Renderizado en:** `app/host/messages/[threadId]/page.tsx` (línea 106), `app/cleaner/messages/[threadId]/page.tsx` (línea 101)

#### 4. ✅ `addThreadParticipant` valida permisos:
- **Código:** `lib/chat/auth.ts` (líneas 443-621)
- **Validación HOST_TEAM:** `if (actorParticipant.role !== "OWNER") throw Error` (línea 467)
- **Endpoint:** `app/api/chat/threads/[threadId]/participants/route.ts` (línea 32) — llama a `addThreadParticipant`

#### 5. ✅ `removeThreadParticipant` valida permisos:
- **Código:** `lib/chat/auth.ts` (líneas 627-686)
- **Validación HOST_TEAM:** `if (actorParticipant.role !== "OWNER") throw Error` (línea 650)
- **Endpoint:** `app/api/chat/threads/[threadId]/participants/[userId]/route.ts` (línea 22) — llama a `removeThreadParticipant`

#### 6. ✅ Cross-tenant support:
- **Threads:** No se filtra por `tenantId` en queries de threads
- **Messages:** No se filtra por `tenantId` en queries de messages (línea 43 de `app/api/chat/threads/[threadId]/messages/route.ts`)
- **Participants:** `ChatParticipant` no tiene `tenantId` — acceso basado solo en `userId` y `threadId`

---

## SETUP REQUERIDO

### Usuarios de prueba necesarios:
1. **HostA** (role: `OWNER` | `ADMIN` | `MANAGER` | `AUXILIAR`) — tenantId: `tenant_a`
2. **HostB** (role: `OWNER` | `ADMIN` | `MANAGER` | `AUXILIAR`) — tenantId: `tenant_b` (diferente de HostA)
3. **CleanerTL** (role: `CLEANER`) — tenantId: `tenant_c` (diferente de HostA/HostB)
4. **CleanerM1** (role: `CLEANER`) — tenantId: `tenant_c` (miembro del mismo team que CleanerTL, pero no participant aún)
5. **CleanerX** (role: `CLEANER`) — tenantId: `tenant_d` (outsider, no relacionado)

### Threads de prueba:
- **T1**: `HOST_CLEANER` entre HostA ↔ CleanerTL
- **T2**: `HOST_TEAM` con `teamId` definido entre HostA ↔ CleanerTL (CleanerTL es `OWNER`)
- **T3**: `TEAM_INTERNAL` (opcional)

---

## CASO 1: No participant abre threadId directo → BLOQUEADO

### Setup:
- Logueado como **HostB** (o **CleanerX**)

### Pasos:
1. Abrir `/host/messages/[threadId-de-T1]` (si HostB) o `/cleaner/messages/[threadId-de-T1]` (si CleanerX)
2. Verificar respuesta del servidor

### Resultado esperado:
- ❌ **404 Not Found** (o redirect a `/login` si no está autenticado)
- NO debe cargar mensajes ni metadata del thread
- NO debe mostrar el thread en la lista de threads

### Resultado real:
- [ ] **PASS** / [ ] **FAIL**

### Evidencia:
- Ruta probada: `/host/messages/[threadId]` o `/cleaner/messages/[threadId]`
- Screenshot: (adjuntar si FAIL)
- Logs del servidor: (si aplica)

### Notas:
- Verificar que `requireChatParticipant` en `app/host/messages/[threadId]/page.tsx` y `app/cleaner/messages/[threadId]/page.tsx` está llamando `requireChatParticipant(threadId, user.id)` antes de cargar el thread.
- Verificar que `requireChatParticipant` en `lib/chat/auth.ts` busca `ChatParticipant` con `leftAt: null`.

---

## CASO 2: Participant abre thread → OK

### Setup:
- Logueado como **HostA** (participant en T1 y T2)

### Pasos:
1. Abrir `/host/messages/[threadId-de-T1]`
2. Verificar que los mensajes cargan
3. Enviar un mensaje (POST `/api/chat/threads/[threadId]/messages`)
4. Verificar que el mensaje aparece en la UI

### Resultado esperado:
- ✅ Thread se carga correctamente
- ✅ Mensajes se muestran
- ✅ Puedo enviar mensaje (POST 201)
- ✅ El mensaje aparece en la UI inmediatamente

### Resultado real:
- [ ] **PASS** / [ ] **FAIL**

### Evidencia:
- Ruta probada: `/host/messages/[threadId-de-T1]`
- Screenshot: (adjuntar si FAIL)
- Network tab: POST `/api/chat/threads/[threadId]/messages` → 201

### Notas:
- Verificar que `requireChatParticipant` permite acceso si `ChatParticipant` existe con `leftAt: null`.
- Verificar que `listThreadsForUser` en `lib/chat/auth.ts` devuelve solo threads donde el usuario es participant.

---

## CASO 3: Host en HOST_TEAM no ve "Administrar miembros"

### Setup:
- **HostA** abre T2 (HOST_TEAM)

### Pasos:
1. Abrir `/host/messages/[threadId-de-T2]`
2. Verificar que NO existe botón/acción "Administrar miembros"
3. Intentar llamar `POST /api/chat/threads/[threadId]/participants` directamente (usando fetch en DevTools)
4. Intentar llamar `DELETE /api/chat/threads/[threadId]/participants/[userId]` directamente

### Resultado esperado:
- ❌ NO existe botón "Administrar miembros" en la UI
- ❌ `POST /api/chat/threads/[threadId]/participants` → **403 Forbidden**
- ❌ `DELETE /api/chat/threads/[threadId]/participants/[userId]` → **403 Forbidden**

### Resultado real:
- [ ] **PASS** / [ ] **FAIL**

### Evidencia:
- Ruta probada: `/host/messages/[threadId-de-T2]`
- Network tab: POST/DELETE → 403
- Screenshot de la UI (sin botón)

### Notas:
- Verificar que `ManageThreadMembers` en `components/chat/ManageThreadMembers.tsx` solo se muestra si `threadType === "HOST_TEAM"` Y `viewerParticipantRole === "OWNER"`.
- Verificar que `addThreadParticipant` en `lib/chat/auth.ts` valida `actorParticipant.role !== "OWNER"` para HOST_TEAM.

---

## CASO 4: TL (OWNER) en HOST_TEAM sí ve "Administrar miembros"

### Setup:
- **CleanerTL** abre T2 (HOST_TEAM, role OWNER)

### Pasos:
1. Abrir `/cleaner/messages/[threadId-de-T2]`
2. Verificar que el botón "Administrar miembros" es visible
3. Hacer click en el botón
4. Verificar que el modal se abre
5. Hacer `GET /api/chat/threads/[threadId]/team-members`
6. Verificar que la respuesta NO incluye lista masiva (solo TL por ahora)

### Resultado esperado:
- ✅ Botón "Administrar miembros" visible
- ✅ Modal se abre correctamente
- ✅ `GET /api/chat/threads/[threadId]/team-members` → **200 OK**
- ✅ Respuesta incluye solo el TL (viewer) como miembro (por ahora)

### Resultado real:
- [ ] **PASS** / [ ] **FAIL**

### Evidencia:
- Ruta probada: `/cleaner/messages/[threadId-de-T2]`
- Network tab: GET `/api/chat/threads/[threadId]/team-members` → 200
- Screenshot del modal

### Notas:
- Verificar que `ManageThreadMembers` se renderiza si `threadType === "HOST_TEAM"` y `viewerParticipantRole === "OWNER"`.
- Verificar que `GET /api/chat/threads/[threadId]/team-members` valida `viewerParticipant.role === "OWNER"` y `thread.type === "HOST_TEAM"`.

---

## CASO 5: Permisos endpoints participants

### Setup:
- Thread T2 (HOST_TEAM)

### Pruebas:

#### 5A) HostA intenta POST /participants → 403
- Logueado como **HostA**
- `POST /api/chat/threads/[threadId-de-T2]/participants` con `{ userId: "any-user-id" }`
- Esperado: **403 Forbidden**

#### 5B) CleanerX (no participant) intenta POST/DELETE → 404/403
- Logueado como **CleanerX** (no es participant de T2)
- `POST /api/chat/threads/[threadId-de-T2]/participants` con `{ userId: "any-user-id" }`
- Esperado: **404 Not Found** (porque `requireChatParticipant` falla)

#### 5C) CleanerTL (OWNER) intenta POST/DELETE
- Logueado como **CleanerTL** (OWNER en T2)
- `POST /api/chat/threads/[threadId-de-T2]/participants` con `{ userId: "invalid-user-id" }`
- Esperado: **400/403** (validación de usuario)
- `POST /api/chat/threads/[threadId-de-T2]/participants` con `{ userId: CleanerTL.id }` (ya participant)
- Esperado: **200 OK** o **409 Conflict** (idempotente)

### Resultado esperado:
- ❌ HostA → 403
- ❌ CleanerX → 404/403
- ✅ CleanerTL (inválido) → 400/403
- ✅ CleanerTL (idempotente) → 200/409

### Resultado real:
- [ ] **PASS** / [ ] **FAIL**

### Evidencia:
- Network tab: respuestas HTTP de cada intento
- Logs del servidor: (si aplica)

### Notas:
- Verificar que `requireChatParticipant` se llama al inicio de `POST /api/chat/threads/[threadId]/participants`.
- Verificar que `addThreadParticipant` valida `actorParticipant.role === "OWNER"` para HOST_TEAM.
- Verificar idempotencia: si el participant ya existe, no debe fallar.

---

## CASO 6: Acceso basado SOLO en participants (no tenant/property)

### Setup:
- Thread T1 o T2 donde `propertyId`/`tenantId` no coinciden (o son null)
- O crear un thread donde HostA y CleanerTL tienen `tenantId` diferentes

### Pasos:
1. Verificar que HostA puede acceder a T1/T2 aunque `tenantId` sea diferente
2. Verificar que CleanerTL puede acceder a T1/T2 aunque `tenantId` sea diferente
3. Verificar que `listThreadsForUser` devuelve el thread aunque `tenantId` no coincida

### Resultado esperado:
- ✅ Acceso permitido solo por participant
- ✅ NO falla por tenant mismatch
- ✅ `listThreadsForUser` devuelve threads donde el usuario es participant, sin filtrar por `tenantId`

### Resultado real:
- [ ] **PASS** / [ ] **FAIL**

### Evidencia:
- Ruta probada: `/host/messages/[threadId]` y `/cleaner/messages/[threadId]`
- Network tab: GET `/api/chat/threads` → lista incluye thread cross-tenant
- Logs del servidor: (verificar que no hay filtro por `tenantId`)

### Notas:
- Verificar que `listThreadsForUser` en `lib/chat/auth.ts` NO filtra por `tenantId`.
- Verificar que `requireChatParticipant` NO valida `tenantId`.
- Verificar que las queries en `app/api/chat/threads/route.ts` y `app/host/messages/page.tsx` y `app/cleaner/messages/page.tsx` NO filtran por `tenantId`.

---

## CASO 7: Cross-tenant Host↔Cleaner funciona

### Setup:
- Asegurar que **HostA** y **CleanerTL** tienen `tenantId` diferentes
- Thread T1 o T2 existe entre ellos

### Pasos:
1. Logueado como **HostA**:
   - Abrir `/host/messages`
   - Verificar que T1/T2 aparecen en la lista
   - Abrir T1/T2
   - Enviar un mensaje
2. Logueado como **CleanerTL**:
   - Abrir `/cleaner/messages`
   - Verificar que T1/T2 aparecen en la lista
   - Abrir T1/T2
   - Ver el mensaje de HostA
   - Enviar un mensaje de respuesta

### Resultado esperado:
- ✅ Ambos usuarios ven el thread en su lista
- ✅ Ambos pueden abrir el thread
- ✅ Ambos pueden enviar y recibir mensajes
- ✅ Funciona igual que si fueran del mismo tenant

### Resultado real:
- [ ] **PASS** / [ ] **FAIL**

### Evidencia:
- Screenshots de ambas listas de threads
- Screenshots del thread con mensajes de ambos usuarios
- Network tab: POST messages desde ambos usuarios → 201

### Notas:
- Verificar que `listThreadsForUser` no filtra por `tenantId`.
- Verificar que `createOrGetThreadHostCleaner` crea participants aunque `tenantId` sea diferente.
- Verificar que los mensajes se crean con `tenantId` del thread (no del usuario).

---

## CASO 8: Logout cross-tab + reingreso no rompe chat

### Setup:
- 2 pestañas abiertas con **HostA** (o **CleanerTL**), ambas en un thread

### Pasos:
1. En pestaña A: Logout (Perfil → Cerrar sesión)
2. Verificar que ambas pestañas redirigen a `/login`
3. En pestaña A: Re-login como HostA
4. Verificar que redirige a `/app` → `/host/hoy` (o `/cleaner`)
5. Abrir `/host/messages` (o `/cleaner/messages`)
6. Verificar que los threads visibles son solo los que tienen participant activo

### Resultado esperado:
- ✅ Ambas pestañas redirigen a `/login` automáticamente
- ✅ Re-login funciona correctamente
- ✅ `/app` redirige al ambiente correcto
- ✅ Lista de threads muestra solo threads donde el usuario es participant activo

### Resultado real:
- [ ] **PASS** / [ ] **FAIL**

### Evidencia:
- Screenshots de ambas pestañas durante logout
- Screenshot de la lista de threads después de re-login
- Network tab: GET `/api/chat/threads` → respuesta correcta

### Notas:
- Verificar que `LogoutSyncListener` está montado en los layouts.
- Verificar que `broadcastLogout` funciona correctamente.
- Verificar que `listThreadsForUser` devuelve solo threads con `leftAt: null`.

---

## CHECKS EXTRA

### ✅ Confirmar que `listThreadsForUser` SOLO devuelve threads donde user es participant
- **Código revisado:** `lib/chat/auth.ts` → `listThreadsForUser` (líneas 84-172)
- **Query:** `where: { id: { in: threadIds } }` donde `threadIds` viene de `ChatParticipant.findMany({ where: { userId: viewerUserId, leftAt: null } })`
- **Verificado:** NO filtra por `tenantId`, solo por `ChatParticipant` activo
- **Status:** ✅ **OK**

### ✅ Confirmar que `requireChatParticipant` se llama antes de:
- **Leer thread:** ✅ `app/host/messages/[threadId]/page.tsx` (línea 27), `app/cleaner/messages/[threadId]/page.tsx` (línea 27)
- **Leer messages:** ✅ `app/api/chat/threads/[threadId]/messages/route.ts` (línea 30, GET)
- **Enviar messages:** ✅ `app/api/chat/threads/[threadId]/messages/route.ts` (línea 143, POST)
- **Uploads:** ✅ `app/api/chat/threads/[threadId]/uploads/route.ts` (línea 29)
- **Team members:** ✅ `app/api/chat/threads/[threadId]/team-members/route.ts` (línea 22)
- **Agregar/remover participants:** ✅ `lib/chat/auth.ts` → `addThreadParticipant` (línea 449), `removeThreadParticipant` (línea 633)
- **Status:** ✅ **OK** — Todas las rutas críticas están protegidas

---

## RESUMEN

| Caso | Descripción | Resultado |
|------|-------------|-----------|
| 1 | No participant → BLOQUEADO | [ ] PASS / [ ] FAIL |
| 2 | Participant → OK | [ ] PASS / [ ] FAIL |
| 3 | Host en HOST_TEAM no ve "Administrar miembros" | [ ] PASS / [ ] FAIL |
| 4 | TL en HOST_TEAM sí ve "Administrar miembros" | [ ] PASS / [ ] FAIL |
| 5 | Permisos endpoints participants | [ ] PASS / [ ] FAIL |
| 6 | Acceso SOLO por participants (no tenant/property) | [ ] PASS / [ ] FAIL |
| 7 | Cross-tenant Host↔Cleaner funciona | [ ] PASS / [ ] FAIL |
| 8 | Logout cross-tab + reingreso no rompe chat | [ ] PASS / [ ] FAIL |

**Total:** [ ] 0/8 PASS / [ ] 8/8 PASS

---

## PRÓXIMOS PASOS

Si **8/8 PASS**:
- ✅ ETAPA 3 completada
- 🎯 Siguiente: **ETAPA 4** — Teams/Memberships reales + Squads (para desbloquear `team-members` real y agregar miembros reales al HOST_TEAM)

Si hay **FAILs**:
- Revisar código relacionado
- Corregir bugs
- Re-ejecutar tests fallidos

---

## NOTAS PARA EJECUCIÓN MANUAL

### Comandos útiles para verificar datos:

```bash
# Abrir Prisma Studio para inspeccionar datos
npx prisma studio

# Verificar ChatParticipant activos
SELECT * FROM "ChatParticipant" WHERE "leftAt" IS NULL;

# Verificar threads y sus participants
SELECT t.id, t.type, t."teamId", p."userId", p.role, p."leftAt"
FROM "ChatThread" t
LEFT JOIN "ChatParticipant" p ON t.id = p."threadId"
WHERE p."leftAt" IS NULL
ORDER BY t."createdAt" DESC;
```

### Rutas para probar manualmente:

1. **Caso 1 (No participant):**
   - `/host/messages/[threadId-de-otro-usuario]` o `/cleaner/messages/[threadId-de-otro-usuario]`
   - Esperado: **404 Not Found**

2. **Caso 2 (Participant):**
   - `/host/messages/[threadId-propio]` o `/cleaner/messages/[threadId-propio]`
   - Esperado: Thread carga correctamente, puedo enviar mensajes

3. **Caso 3 (Host en HOST_TEAM):**
   - `/host/messages/[threadId-HOST_TEAM]`
   - Esperado: NO ve botón "Administrar miembros"
   - `POST /api/chat/threads/[threadId]/participants` → **403**

4. **Caso 4 (TL en HOST_TEAM):**
   - `/cleaner/messages/[threadId-HOST_TEAM]` (como CleanerTL con role OWNER)
   - Esperado: Ve botón "Administrar miembros", modal se abre

5. **Caso 5 (Permisos endpoints):**
   - Usar DevTools Network tab o `curl`/`fetch` para probar endpoints
   - Esperado: 403/404 según permisos

6. **Caso 6 (Acceso solo por participants):**
   - Verificar que threads cross-tenant funcionan si hay participant activo

7. **Caso 7 (Cross-tenant):**
   - Crear thread entre HostA (tenant_a) y CleanerTL (tenant_c)
   - Verificar que ambos pueden acceder

8. **Caso 8 (Logout cross-tab):**
   - Abrir 2 pestañas, logout en una, verificar que ambas redirigen

### Comandos curl para pruebas rápidas (opcional):

```bash
# Caso 5A: HostA intenta POST /participants → 403
curl -X POST http://localhost:3000/api/chat/threads/[threadId]/participants \
  -H "Cookie: hausdame_session=..." \
  -H "Content-Type: application/json" \
  -d '{"userId":"any-user-id"}'

# Caso 5B: CleanerX (no participant) intenta POST → 404
curl -X POST http://localhost:3000/api/chat/threads/[threadId]/participants \
  -H "Cookie: hausdame_session=..." \
  -H "Content-Type: application/json" \
  -d '{"userId":"any-user-id"}'

# Caso 5C: CleanerTL (OWNER) intenta POST → 200/409 (idempotente)
curl -X POST http://localhost:3000/api/chat/threads/[threadId]/participants \
  -H "Cookie: hausdame_session=..." \
  -H "Content-Type: application/json" \
  -d '{"userId":"cleaner-tl-id"}'
```

**Nota:** Reemplazar `[threadId]` y `hausdame_session=...` con valores reales de tu sesión.
