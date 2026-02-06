# ETAPA 4.1 - AUDITORÍA PRELIMINAR

## FASE 0 - AUDITORÍA RÁPIDA (Sin cambios)

### A) Referencias actuales encontradas

#### 1. ThreadParticipantRole
**Ubicaciones:**
- `prisma/schema.prisma` (línea 862, 1111-1115):
  - Enum `ThreadParticipantRole` definido
  - Modelo `ChatParticipant.role` usa `ThreadParticipantRole`
- `prisma/migrations/20250124120000_add_thread_type_and_participant_roles/migration.sql`:
  - Enum `ThreadParticipantRole` creado en migración
- `ETAPA3_MIGRATION_COMPLETA.md` y `ETAPA3_REVISION.md`:
  - Documentación de migración previa

**Archivos que probablemente usan ThreadParticipantRole (a revisar):**
- `lib/chat/auth.ts` (funciones de chat)
- Archivos de tipos TypeScript generados por Prisma

#### 2. createTeamMember / CreateMemberForm / TeamMemberActions
**Ubicaciones:**
- `app/host/teams/actions.ts`:
  - `createTeamMember()` - crea TeamMember sin User
  - `updateTeamMember()`, `toggleTeamMemberStatus()`, `deleteTeamMember()`
- `app/host/teams/[id]/CreateMemberForm.tsx`:
  - UI para crear TeamMember (name, phone, schedules)
- `app/host/teams/[id]/TeamMemberActions.tsx`:
  - UI para editar/desactivar/eliminar TeamMember
- `app/host/teams/[id]/page.tsx`:
  - Renderiza CreateMemberForm y TeamMemberActions

#### 3. Determinar tenant/team del host
**Ubicaciones:**
- `lib/tenant.ts`:
  - `getDefaultTenant()` - devuelve el primer tenant (temporal)
  - Comentario: "Por ahora: devuelve el primer tenant que exista. Luego lo cambiaremos para usar el usuario logueado o subdominios."
- `lib/auth/session.ts`:
  - `getCurrentUser()` - retorna user con `tenantId`
- Host pages generalmente usan:
  - `getDefaultTenant()` para obtener tenant
  - `user.tenantId` del usuario logueado (vía `requireHostUser()`)

**Conclusión:** El tenant actual se determina principalmente por `user.tenantId` del usuario logueado.

#### 4. TeamMemberSelect / AssignmentSection
**Ubicaciones:**
- `app/host/cleanings/[id]/TeamMemberSelect.tsx`:
  - Selector de TeamMember para asignar limpiezas
- `app/host/cleanings/[id]/AssignmentSection.tsx`:
  - Sección de asignación de limpiezas
- `app/host/cleanings/[id]/page.tsx`:
  - Usa TeamMemberSelect para asignar cleaners
- `app/host/cleanings/needs-attention/page.tsx`:
  - Lista de limpiezas que necesitan atención

### B) Tablas relacionadas con chat

**Modelos confirmados:**
- `ChatThread` (línea ~829 en schema.prisma):
  - Campos: `id`, `tenantId`, `propertyId`, `type`, `teamId`, `applicationId`, `cleaningId`, `status`, `lastMessageAt`
  - Enums: `ThreadType`, `ChatThreadContextType`, `ChatThreadStatus`
- `ChatParticipant` (línea ~852 en schema.prisma):
  - Campos: `id`, `threadId`, `userId`, `role`, `addedByUserId`, `teamId`, `joinedAt`, `leftAt`
  - Enum: `ThreadParticipantRole` (a renombrar a `ChatParticipantRole`)
- `ChatMessage` (línea ~877 en schema.prisma):
  - Campos: `id`, `tenantId`, `threadId`, `senderUserId`, `body`, `type`, `assetId`, `clientMessageId`, `serverCreatedAt`

### C) Flujo actual de asignación de limpiezas

**Componentes:**
1. `TeamMemberSelect.tsx` - muestra lista de TeamMember activos del team
2. `AssignmentSection.tsx` - sección completa de asignación
3. `app/host/cleanings/[id]/page.tsx` - página de detalle de limpieza

**Lógica actual:**
- Filtra TeamMember por `teamId` y `isActive: true`
- Asigna `cleaning.assignedMemberId` = TeamMember.id
- NO usa User ni TeamMembership (aún no existe)

### D) Estado actual de TeamMember

**Confirmado:**
- TeamMember NO tiene `userId` poblado en DB (confirmado por usuario)
- TeamMember es perfil operativo: `name`, `phone`, `workingDays`, `workingStartTime`, `workingEndTime`, `teamId`, `tenantId`, `isActive`
- Auth actual es por User (email/password)
- No hay signup de cleaner hoy
- Host crea TeamMember manualmente desde `/host/teams/[id]`

### E) Referencias a revisar en código TypeScript

**Archivos que probablemente usan ThreadParticipantRole (a buscar):**
- `lib/chat/auth.ts`
- Componentes de chat (ChatThreadView, ManageThreadMembers, etc.)
- API routes de chat

**Próximos pasos:**
1. Buscar todas las referencias a `ThreadParticipantRole` en código TS
2. Revisar `lib/chat/auth.ts` para entender guards actuales
3. Preparar estrategia de migración segura para renombrar enum

