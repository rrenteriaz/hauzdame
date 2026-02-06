# REVISIÓN ETAPA 3 - CHAT BLINDADO POR PARTICIPANTS

## ✅ COMPLETADO

### FASE 0 - Auditoría
- ✅ Revisado schema actual de ChatThread, ChatParticipant, ChatMessage
- ✅ Revisadas rutas existentes (GET threads, GET/POST messages)
- ✅ Identificados filtros tenantId que deben removerse

### FASE 1 - Modelo de Datos (Prisma)
- ✅ Agregados enums `ThreadType` y `ThreadParticipantRole` al schema
- ✅ Agregados campos a `ChatThread`: `type`, `teamId` con índices
- ✅ Agregados campos a `ChatParticipant`: `role`, `addedByUserId`, `teamId`, `createdAt`, `updatedAt` con índices
- ✅ Agregadas relaciones: `ChatThread.team`, `ChatParticipant.team`, `ChatParticipant.addedBy`
- ✅ Agregadas relaciones inversas: `Team.chatThreads`, `Team.chatParticipants`
- ✅ Creada migración SQL: `20250124120000_add_thread_type_and_participant_roles/migration.sql`
- ✅ Migración incluye backfill para asignar role OWNER al primer participante

### FASE 2 - Helpers de Autorización
- ✅ Creado `lib/chat/auth.ts` con todas las funciones requeridas:
  - ✅ `requireChatParticipant(threadId, viewerUserId)` - Valida acceso por participant activo
  - ✅ `listThreadsForUser(viewerUserId)` - Lista threads solo por participant (sin tenantId)
  - ✅ `createOrGetThreadHostCleaner(...)` - Crea/obtiene thread HOST_CLEANER
  - ✅ `createOrGetThreadHostTeam(...)` - Crea/obtiene thread HOST_TEAM
  - ✅ `addThreadParticipant(...)` - Agrega participant con reglas por tipo
  - ✅ `removeThreadParticipant(...)` - Remueve participant con reglas por tipo
  - ✅ `getDisplayNameForMessage(...)` - Helper para nombres según contexto

### FASE 3 - Rutas y Pages
- ✅ Actualizado `app/api/chat/threads/route.ts`: Usa `listThreadsForUser()`, sin filtros tenantId
- ✅ Actualizado `app/api/chat/threads/[threadId]/messages/route.ts`: 
  - ✅ GET: Usa `requireChatParticipant()` antes de leer mensajes
  - ✅ POST: Usa `requireChatParticipant()` antes de enviar, tenantId del thread (no del user)
- ✅ Actualizado `app/host/messages/page.tsx`: Usa `listThreadsForUser()`, sin filtros tenantId
- ✅ Actualizado `app/cleaner/messages/page.tsx`: Usa `listThreadsForUser()`, sin filtros tenantId
- ✅ Actualizado `app/host/messages/[threadId]/page.tsx`: Usa `requireChatParticipant()`, lógica de counterpart según type
- ✅ Actualizado `app/cleaner/messages/[threadId]/page.tsx`: Usa `requireChatParticipant()`, lógica de counterpart según type
- ✅ Actualizado `lib/auth/guards.ts`: `canAccessThread()` marcado como deprecated (usar `requireChatParticipant`)

## ⚠️ PROBLEMAS PENDIENTES

### PROBLEMA CRÍTICO: Migración no aplicada en BD
**Error**: El cliente de Prisma no incluye los nuevos campos (`type`, `role`, `teamId`, etc.) porque la migración SQL no se ha ejecutado en la base de datos.

**Causa**: La migración fue marcada como aplicada (`prisma migrate resolve --applied`) pero el SQL no se ejecutó.

**Solución requerida**:
1. Ejecutar la migración SQL manualmente en la base de datos, O
2. Ejecutar `prisma db push --accept-data-loss` (pero hay filas existentes sin `updatedAt`)
3. Primero ejecutar: `UPDATE "ChatParticipant" SET "updatedAt" = COALESCE("joinedAt", CURRENT_TIMESTAMP);`
4. Luego aplicar la migración completa

**Archivo SQL a ejecutar**: `prisma/migrations/20250124120000_add_thread_type_and_participant_roles/migration.sql`

### PROBLEMA: Errores TypeScript
**Error**: 46 errores de tipo porque Prisma Client no incluye los nuevos campos.

**Causa**: La migración no se aplicó en la BD, por lo tanto `prisma generate` no puede generar tipos correctos.

**Solución**: Resolver el problema anterior primero.

### PROBLEMA: Validación de TeamMember
**Nota**: En `addThreadParticipant()` y `createOrGetThreadHostTeam()`, la validación de que un User es miembro de un Team está comentada porque `TeamMember` no tiene relación directa con `User.id` en el modelo actual.

**TODO FUTURO**: Cuando `TeamMember` tenga `userId`, validar membership correctamente.

## 📋 PENDIENTE

### FASE 4 - UI para TL administrar miembros (HOST_TEAM)
- ⏳ Componente para mostrar lista de participantes (solo visible para TL/OWNER)
- ⏳ Botón "Agregar miembro" (solo TL/OWNER)
- ⏳ Selector de miembros del team
- ⏳ Botón "Remover" para cada participante (solo TL/OWNER)
- ⏳ Host NO debe ver este panel (solo TL)

### FASE 5 - Tests de Seguridad
- ⏳ Test 1: User NO participante intenta abrir threadId → 404
- ⏳ Test 2: User participante abre thread → ok
- ⏳ Test 3: Host abre thread HOST_TEAM → ve chat, NO ve roster
- ⏳ Test 4: TL agrega miembro → el miembro ahora ve el thread
- ⏳ Test 5: Host intenta agregar/remover → prohibido (403)
- ⏳ Test 6: Cleaner de otro team intenta agregarse → prohibido
- ⏳ Test 7: Cross-tenant: Host y Cleaner diferentes tenantId → funciona
- ⏳ Test 8: Logout cross-tab no rompe chat

### FASE 6 - Actualizar creación de threads
- ⏳ Actualizar `app/api/applications/route.ts` para usar `createOrGetThreadHostCleaner()` cuando se acepta una aplicación
- ⏳ Asegurar que participants se crean correctamente (Host OWNER, Cleaner MEMBER)

## 🔍 VERIFICACIONES REALIZADAS

✅ Schema Prisma: Enums y campos agregados correctamente
✅ Relaciones: Todas las relaciones bidireccionales agregadas
✅ Migración SQL: Creada con backfill para roles
✅ Helpers de auth: Implementados según especificación
✅ Rutas API: Actualizadas para usar participants, sin filtros tenantId
✅ Pages: Actualizadas para usar helpers centralizados
✅ Queries: Sin filtros tenantId en queries de chat (solo participants)

## 📝 NOTAS IMPORTANTES

1. **REGLA DE ORO**: El acceso depende SOLO de `ChatParticipant.userId` con `leftAt = null`. NO de tenantId, propertyId ni roles externos.

2. **Cross-tenant**: Los threads y mensajes pueden tener `tenantId` diferentes, pero el acceso se valida por participant.

3. **TenantId en ChatMessage**: Se usa el `tenantId` del thread, no del user que envía (para soportar cross-tenant).

4. **Backfill de roles**: La migración asigna OWNER al primer participante (por joinedAt) y MEMBER a los demás.

5. **Validación TeamMember**: Actualmente se valida que el usuario tenga role CLEANER, pero no se valida membership en el Team (porque TeamMember no tiene userId). Esto debe completarse en el futuro.

## ⚠️ ACCIÓN REQUERIDA INMEDIATA

**EJECUTAR LA MIGRACIÓN SQL EN LA BASE DE DATOS** antes de continuar con las pruebas.

El archivo a ejecutar es: `prisma/migrations/20250124120000_add_thread_type_and_participant_roles/migration.sql`

Después de ejecutar, regenerar Prisma Client:
```bash
npx prisma generate
```

