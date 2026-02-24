# Arquitectura: TeamMembership como Estándar

**Fecha de decisión:** 2025-01-XX  
**Estado:** Implementado

## Decisión Principal

**TeamMembership es la fuente de verdad única para:**
- Permisos y roles a nivel de equipo
- Asignaciones de trabajo (Cleanings)
- Participación en chats de equipo
- Control de acceso basado en pertenencia al equipo

## Modelos y Roles

### TeamMembership (Estándar)

**Propósito:** Relación User ↔ Team con rol y estado.

**Campos clave:**
- `teamId`: ID del equipo
- `userId`: ID del usuario
- `role`: TeamRole (OWNER, MANAGER, AUXILIAR, CLEANER, HANDYMAN)
- `status`: TeamMembershipStatus (PENDING, ACTIVE, REMOVED)

**Reglas:**
- Solo miembros con `status: "ACTIVE"` tienen acceso al equipo
- El rol determina permisos dentro del equipo
- Unique constraint: `(teamId, userId)` - un usuario solo puede tener una membership por equipo

### TeamMember (Legacy/Deprecado)

**Estado:** Deprecado para asignaciones y permisos. Mantenido solo para casos edge donde un miembro físico del equipo no tiene cuenta de usuario.

**Uso actual:**
- Se mantiene en el schema por compatibilidad
- El código soporta ambos modelos durante la transición
- **NO debe usarse para nuevas funcionalidades**

### UserRole vs TeamRole

**UserRole** (nivel Tenant):
- OWNER, ADMIN, CLEANER, HANDYMAN
- Define permisos a nivel de organización/tenant
- Se usa para acceso general a propiedades, configuración, etc.

**TeamRole** (nivel Team):
- OWNER, MANAGER, AUXILIAR, CLEANER, HANDYMAN
- Define permisos dentro de un equipo específico
- Se usa para asignaciones de trabajo, acceso a chats de equipo, etc.

**Regla:** Si una funcionalidad está relacionada con un equipo específico, usar TeamRole. Si es a nivel de tenant/organización, usar UserRole.

## Asignaciones de Cleanings

### Estándar: `assignedMembershipId`

**Campo:** `Cleaning.assignedMembershipId`  
**Tipo:** FK a `TeamMembership.id`  
**Estado:** Fuente de verdad única

**Campos legacy (deprecados):**
- `assignedToId` (User) - NO usar
- `assignedTeamMemberId` (TeamMember) - NO usar
- `assignedMemberId` (TeamMember) - NO usar

**Migración:**
- El código actual soporta ambos modelos durante la transición
- Nuevas asignaciones deben usar `assignedMembershipId`
- Los campos legacy se mantienen para compatibilidad con datos existentes

## Chats y Participantes

### ChatThread con teamId

**Regla:** Si `ChatThread.teamId` existe, todos los participantes deben tener `TeamMembership ACTIVE` en ese equipo.

### ChatParticipant

**Campos:**
- `userId`: Mantenido para compatibilidad legacy
- `teamMembershipId`: **Nuevo estándar** - FK a `TeamMembership.id` cuando `thread.teamId` existe
- `teamId`: Referencia al equipo del thread (opcional)

**Reglas de creación:**
1. Si `thread.teamId` existe:
   - **Requerir** `TeamMembership ACTIVE` para `(thread.teamId, userId)`
   - Setear `teamMembershipId` al crear el participante
   - Si no existe membership → rechazar con error 403

2. Si `thread.teamId` NO existe:
   - Crear con `userId` como siempre
   - `teamMembershipId` queda `null` (legacy)

**Compatibilidad:**
- Registros legacy pueden tener `teamMembershipId = null`
- `requireThreadAccess()` valida TeamMembership si `thread.teamId` existe, independientemente de si `teamMembershipId` está set

## Autorización

### requireTeamMembership()

**Ubicación:** `lib/authz/teamMembership.ts`

**Funcionalidad:**
- Valida que el usuario tiene `TeamMembership ACTIVE` en el equipo
- Opcionalmente valida que el rol está en una lista permitida
- Lanza error si no cumple

### requireThreadAccess()

**Ubicación:** `lib/authz/teamMembership.ts`

**Funcionalidad:**
- Si `thread.teamId` existe → valida `TeamMembership ACTIVE`
- Valida que el usuario es `ChatParticipant` activo del thread
- Compatible con registros legacy (teamMembershipId null)

## Plan de Migración

### Fase 1: Schema y Backfill ✅ (Completado)

1. Agregar `teamMembershipId` a `ChatParticipant`
2. Crear relación FK a `TeamMembership`
3. Backfill de participantes existentes:
   - Para cada `ChatParticipant` cuyo `thread.teamId` existe
   - Buscar `TeamMembership ACTIVE` para `(thread.teamId, userId)`
   - Si existe exactamente una → setear `teamMembershipId`
   - Si no existe → dejar `null` (legacy, no romper)
   - Si múltiples → elegir la más reciente y loguear

### Fase 2: Lógica de Creación ✅ (Completado)

1. Actualizar `addThreadParticipant()` para:
   - Validar `TeamMembership ACTIVE` si `thread.teamId` existe
   - Setear `teamMembershipId` al crear participante
   - Rechazar si no hay membership

2. Actualizar `createOrGetThreadHostTeam()` para:
   - Validar memberships al crear participantes iniciales
   - Setear `teamMembershipId` desde el inicio

### Fase 3: Limpieza (Futuro)

1. Deprecar campos legacy de Cleaning (asignaciones)
2. Migrar datos existentes a `assignedMembershipId`
3. Eliminar soporte para TeamMember en asignaciones

## Casos de Uso y Ejemplos

### Caso 1: Thread con teamId, agregar participante con membership ACTIVE

```typescript
// ✅ CORRECTO
const membership = await prisma.teamMembership.findUnique({
  where: { teamId_userId: { teamId: thread.teamId, userId: targetUserId } }
});

if (membership?.status === "ACTIVE") {
  await prisma.chatParticipant.create({
    data: {
      threadId,
      userId: targetUserId,
      teamMembershipId: membership.id, // ✅ Setear
      teamId: thread.teamId,
    }
  });
}
```

### Caso 2: Thread con teamId, agregar participante sin membership

```typescript
// ❌ DEBE RECHAZAR
if (!membership || membership.status !== "ACTIVE") {
  throw new Error("El usuario debe ser miembro activo del equipo");
}
```

### Caso 3: Thread sin teamId

```typescript
// ✅ CORRECTO (legacy)
await prisma.chatParticipant.create({
  data: {
    threadId,
    userId: targetUserId,
    teamMembershipId: null, // ✅ Null es válido para threads sin teamId
  }
});
```

### Caso 4: Acceso a thread con teamId

```typescript
// ✅ CORRECTO
const thread = await prisma.chatThread.findUnique({
  where: { id: threadId },
  select: { teamId: true }
});

if (thread?.teamId) {
  await requireTeamMembership(thread.teamId); // ✅ Validar membership
}

const participant = await prisma.chatParticipant.findFirst({
  where: { threadId, userId, leftAt: null }
});
// ✅ Funciona aunque teamMembershipId sea null (legacy)
```

## Verificación y Testing

### Casos de Prueba Manuales

1. **Thread con teamId, agregar participante con membership ACTIVE**
   - ✅ Debe crear `ChatParticipant` con `teamMembershipId` set
   - ✅ Debe permitir acceso al thread

2. **Thread con teamId, agregar participante sin membership**
   - ✅ Debe rechazar con error 403
   - ✅ No debe crear `ChatParticipant`

3. **Thread sin teamId**
   - ✅ Debe crear `ChatParticipant` con `teamMembershipId = null`
   - ✅ Debe funcionar normalmente

4. **Acceso a thread con teamId**
   - ✅ Debe validar `TeamMembership ACTIVE`
   - ✅ Debe funcionar con registros legacy (`teamMembershipId = null`)

### Cleaner Teams (Mi equipo)

1. **Itzel (TL)**
   - /cleaner/team => muestra “Mi equipo”
   - /cleaner/teams => card “Mi equipo”
   - si team.status=PAUSED => badge “Pausado”

2. **Kath (SM + TL de su propio team)**
   - /cleaner/teams => ve 2 cards: “Mi equipo” y “Itzel's Team”
   - click en “Itzel's Team” => /cleaner/teams/[teamId] carga OK
   - no ve botones admin
   - badge respeta: Pausado / Sin propiedades / Activo

3. **SM REMOVED**
   - membership.status=REMOVED
   - /cleaner/teams => no aparece (solo ACTIVE)
   - /cleaner/teams/[teamId] => 404/redirect seguro
   - histórico personal en limpiezas/chats (nota)

4. **Acceso inválido**
   - usuario sin TeamMembership ACTIVE al teamId => 404/redirect seguro

### Backfill Verification

**Script de verificación:**
```bash
npx tsx scripts/verify-chat-participant-membership.ts
```

El script verifica:
1. Participantes activos con `thread.teamId` pero sin `teamMembershipId`
2. Total de participantes con `teamMembershipId` set
3. Integridad: `teamMembershipId` debe apuntar a `TeamMembership ACTIVE`
4. Coherencia: `teamMembershipId.teamId` debe coincidir con `thread.teamId`

**Esperado:**
- Participantes sin `teamMembershipId` (con `thread.teamId`): 0 o muy bajo (solo casos edge sin membership)
- Integridad: 0 errores
- Coherencia: 0 errores

## Notas de Compatibilidad

### Backwards Compatibility

- ✅ `userId` se mantiene en `ChatParticipant` (no se elimina)
- ✅ `teamMembershipId` es nullable (permite registros legacy)
- ✅ `requireThreadAccess()` funciona con o sin `teamMembershipId`
- ✅ Campos legacy de Cleaning se mantienen (no se eliminan)

### Riesgos

1. **Participantes legacy sin membership:**
   - Si un thread tiene `teamId` pero participantes sin `teamMembershipId`
   - El sistema sigue funcionando (compatibilidad)
   - Pero no garantiza que el usuario tenga membership activa
   - **Mitigación:** Backfill intenta resolver esto; validación en creación previene nuevos casos

2. **Múltiples memberships:**
   - Edge case: usuario con múltiples memberships en el mismo equipo
   - **Mitigación:** Backfill elige la más reciente; validación en creación usa `findUnique` (único por constraint)

## Referencias

- Schema: `prisma/schema.prisma`
- Autorización: `lib/authz/teamMembership.ts`
- Lógica de chats: `lib/chat/auth.ts`
- Migración: `prisma/migrations/YYYYMMDDHHMMSS_add_team_membership_to_chat_participant/`
- Regla crítica Service-only: `docs/contracts/CONTRATO DE TENANTS Y TEAMS (SERVICE-CLEANER).md`
- Invitaciones Host-Property: `docs/contracts/CONTRATO DE INVITACIONES HOST-PROPERTY (CLEANER + MANAGER).md`

