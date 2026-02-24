# Informe: Validaciones y Consultas para Alertas de Limpiezas

**Fecha:** 2025-01-XX  
**Versión:** 1.0  
**Alcance:** Sistema de alertas y atención requerida en Detalle de Limpieza (Host)

---

## Resumen Ejecutivo

Este documento detalla las validaciones y consultas a base de datos que realiza la aplicación para determinar las diferentes alertas y mensajes de atención requerida en el contexto de limpiezas. Se documentan las tablas, columnas y condiciones evaluadas para cada tipo de alerta.

---

## 1. Arquitectura de Validación

El sistema de alertas funciona en dos niveles:

1. **Nivel de Asignación** (`getCleaningAssignmentLevel`): Determina el estado de asignación (0-5)
2. **Atención Requerida** (`getCleaningAttention` + `getCleaningAttentionReasons`): Deriva alertas basadas en el nivel

### Flujo de Validación

```
1. Obtener datos de Cleaning y contexto
   ↓
2. Calcular nivel de asignación (0-5)
   ↓
3. Determinar si requiere atención (basado en nivel)
   ↓
4. Generar razones específicas de atención
   ↓
5. Filtrar y mostrar alertas en UI
```

---

## 2. Consultas Base en Detalle de Limpieza

### 2.1 Consulta Principal: Cleaning

**Archivo:** `app/host/cleanings/[id]/page.tsx` (líneas 104-107)

**Tabla:** `Cleaning`

**Columnas consultadas:**
- `id` (WHERE)
- `tenantId` (WHERE)
- `status` (SELECT)
- `scheduledDate` (SELECT)
- `scheduledAtPlanned` (SELECT, nullable)
- `teamId` (SELECT, nullable)
- `assignedMembershipId` (SELECT, nullable)
- `assignedMemberId` (SELECT, nullable)
- `startedAt` (SELECT, nullable)
- `completedAt` (SELECT, nullable)
- `needsAttention` (SELECT, boolean)
- `attentionReason` (SELECT, nullable)
- `propertyId` (SELECT)

**Include (relaciones):**
- `property` → `id`, `name`, `shortName`
- `reservation` → `id`, `startDate`, `endDate`, `status`
- `assignedTeamMember` → `team` → `id`, `name`
- `assignedMember` → `team` → `id`, `name`
- `TeamMembership` → `User` → `id`, `name`, `email` + `Team` → `id`, `name`
- `team` → `id`, `name` (nuevo, agregado para obtener nombre del Team asignado)
- `cleaningChecklistItems` (ordenado por `area`, `sortOrder`)

**Propósito:** Obtener todos los datos necesarios de la limpieza para evaluar su estado.

---

### 2.2 Consulta: Equipos Disponibles para la Propiedad

**Archivo:** `app/host/cleanings/[id]/page.tsx` (líneas 109-124)

**Tabla:** `PropertyTeam` (legacy)

**Columnas consultadas:**
- `propertyId` (WHERE)
- `tenantId` (WHERE)
- `teamId` (SELECT)
- `team.status` (WHERE, debe ser "ACTIVE")
- `team.id` (SELECT)
- `team.name` (SELECT)

**Condiciones:**
```sql
WHERE propertyId = ? 
  AND tenantId = ? 
  AND team.status = 'ACTIVE'
```

**Propósito:** Determinar si hay equipos configurados para la propiedad (usado para `propertyTeamsCount`).

**Nota:** Si `WORKGROUP_READS_ENABLED=1`, se usa `resolveEffectiveTeamsForProperty` que consulta:
- `HostWorkGroupProperty` → `workGroupId`
- `HostWorkGroup` → `id`, `name`
- `WorkGroupExecutor` → `teamId`, `status` (solo ACTIVE)
- `PropertyTeam` (fallback si no hay WorkGroups)

---

### 2.3 Consulta: Miembros del Team Asignado

**Archivo:** `app/host/cleanings/[id]/page.tsx` (líneas 336-352)

**Tablas consultadas:**

#### A) TeamMembership (moderno)

**Columnas:**
- `teamId` (WHERE, desde `cleaning.teamId`)
- `status` (WHERE, debe ser "ACTIVE")
- `role` (WHERE, debe ser "CLEANER")

**Condiciones:**
```sql
WHERE teamId = ? 
  AND status = 'ACTIVE' 
  AND role = 'CLEANER'
```

**Propósito:** Contar miembros activos del Team asignado a la limpieza.

#### B) TeamMember (legacy)

**Columnas:**
- `teamId` (WHERE, desde `cleaning.teamId`)
- `tenantId` (WHERE)
- `isActive` (WHERE, debe ser `true`)

**Condiciones:**
```sql
WHERE teamId = ? 
  AND tenantId = ? 
  AND isActive = true
```

**Propósito:** Contar miembros legacy activos del Team asignado.

**Resultado:** `teamMembershipsCount = membershipsCount + legacyCount`

**Nota:** Esta consulta solo se ejecuta si `cleaning.teamId` no es `null`. Si es `null`, retorna `[0, 0]`.

---

## 3. Validaciones por Tipo de Alerta

### 3.1 Alerta: "NO_TEAM_EXECUTING" (Sin equipos disponibles)

**Código:** `NO_TEAM_EXECUTING`  
**Severidad:** CRITICAL  
**Tipo:** CONFIGURATION

#### Condiciones Evaluadas

1. **Verificar si hay ejecución:**
   - `cleaning.teamId` es `null`
   - `cleaning.assignedMembershipId` es `null`

2. **Verificar si hay equipos disponibles:**
   - `propertyTeamsCount` (longitud del array de `PropertyTeam`)
   - O `effectiveTeams.teamIds.length > 0` (si WorkGroups habilitado)

#### Lógica

```typescript
if (!cleaning.teamId && !cleaning.assignedMembershipId) {
  const hasAvailableTeams = propertyTeamsCount > 0 || effectiveTeams?.teamIds?.length > 0;
  
  if (!hasAvailableTeams) {
    // Nivel 0: Sin contexto ejecutor
    // Mostrar alerta: "No hay equipos disponibles para esta propiedad"
  }
}
```

#### Tablas Consultadas

- `PropertyTeam` (o `HostWorkGroupProperty` + `WorkGroupExecutor` si WorkGroups habilitado)
- `Team` (para verificar `status = 'ACTIVE'`)

#### Columnas Clave

- `PropertyTeam.propertyId`
- `PropertyTeam.teamId`
- `Team.status`

---

### 3.2 Alerta: "NO_HOST_TEAM_CONFIG" (Configuración pendiente)

**Código:** `NO_HOST_TEAM_CONFIG`  
**Severidad:** WARNING  
**Tipo:** CONFIGURATION

#### Condiciones Evaluadas

- `propertyTeamsCount === 0`

#### Lógica

```typescript
if (propertyTeamsCount === 0) {
  // Mostrar alerta: "Configuración de equipo pendiente"
}
```

#### Tablas Consultadas

- `PropertyTeam`

#### Columnas Clave

- `PropertyTeam.propertyId`
- `PropertyTeam.teamId`

---

### 3.3 Alerta: "NO_AVAILABLE_MEMBER" (Equipo sin miembros activos)

**Código:** `NO_AVAILABLE_MEMBER`  
**Severidad:** CRITICAL  
**Tipo:** CONFIGURATION

#### Condiciones Evaluadas

1. `cleaning.teamId` no es `null` (limpieza asignada a Team)
2. `teamMembershipsCount === 0` (no hay miembros activos)
3. `propertyTeamsCount > 0` (hay equipos configurados en la propiedad)

#### Lógica

```typescript
if (
  cleaning.teamId &&
  teamMembershipsCount === 0 &&
  propertyTeamsCount > 0
) {
  // Mostrar alerta: "El equipo asignado no tiene miembros activos"
}
```

#### Tablas Consultadas

- `TeamMembership` (WHERE `teamId = cleaning.teamId`, `status = 'ACTIVE'`, `role = 'CLEANER'`)
- `TeamMember` (WHERE `teamId = cleaning.teamId`, `isActive = true`)

#### Columnas Clave

- `TeamMembership.teamId`
- `TeamMembership.status`
- `TeamMembership.role`
- `TeamMember.teamId`
- `TeamMember.isActive`

---

### 3.4 Alerta: "CLEANING_PENDING_OVERDUE" (Limpieza atrasada)

**Código:** `CLEANING_PENDING_OVERDUE`  
**Severidad:** CRITICAL  
**Tipo:** OPERATIONAL

#### Condiciones Evaluadas

1. `cleaning.status === 'PENDING'`
2. `scheduledDateStart < startOfToday` (fecha programada es anterior a hoy)

#### Lógica

```typescript
const scheduledDateStart = new Date(scheduledAt);
scheduledDateStart.setHours(0, 0, 0, 0);

if (
  cleaning.status === "PENDING" &&
  scheduledDateStart < startOfToday
) {
  // Mostrar alerta: "Limpieza pendiente con fecha pasada"
}
```

#### Tablas Consultadas

- `Cleaning` (ya cargado)

#### Columnas Clave

- `Cleaning.status`
- `Cleaning.scheduledDate` o `Cleaning.scheduledAtPlanned`

---

### 3.5 Alerta: "NO_PRIMARY_ASSIGNEE" (Sin miembro asignado)

**Código:** `NO_PRIMARY_ASSIGNEE`  
**Severidad:** CRITICAL  
**Tipo:** OPERATIONAL

#### Condiciones Evaluadas

1. `cleaning.status === 'PENDING'`
2. `cleaning.assignedMemberId` es `null`
3. `cleaning.assignedMembershipId` es `null`
4. `propertyTeamsCount > 0` (hay equipos disponibles)
5. `teamMembershipsCount > 0` (hay miembros disponibles)

#### Lógica

```typescript
if (
  cleaning.status === "PENDING" &&
  !cleaning.assignedMemberId &&
  !cleaning.assignedMembershipId &&
  propertyTeamsCount > 0 &&
  teamMembershipsCount > 0
) {
  // Mostrar alerta: "Esta limpieza aún no tiene un miembro asignado"
}
```

#### Tablas Consultadas

- `Cleaning` (ya cargado)
- `PropertyTeam` (para `propertyTeamsCount`)
- `TeamMembership` + `TeamMember` (para `teamMembershipsCount`)

#### Columnas Clave

- `Cleaning.status`
- `Cleaning.assignedMemberId`
- `Cleaning.assignedMembershipId`

---

### 3.6 Alerta: "CLEANING_ASSIGNED_NOT_AVAILABLE" (Cleaner no disponible)

**Código:** `CLEANING_ASSIGNED_NOT_AVAILABLE`  
**Severidad:** CRITICAL  
**Tipo:** OPERATIONAL

#### Condiciones Evaluadas

1. `cleaning.status === 'PENDING'`
2. `cleaning.assignedMemberId` no es `null`
3. El cleaner asignado NO está en la lista de `eligibleMembers`

#### Lógica

```typescript
if (cleaning.status === "PENDING" && cleaning.assignedMemberId) {
  const eligibleMembers = await getEligibleMembersForCleaning(
    tenantId,
    propertyId,
    scheduledDate
  );
  
  const assignedMemberIsEligible = eligibleMembers.some(
    (m) => m.id === cleaning.assignedMemberId
  );
  
  if (!assignedMemberIsEligible) {
    // Mostrar alerta: "El cleaner asignado no está disponible"
  }
}
```

#### Consulta de Miembros Elegibles

**Archivo:** `lib/cleaning-eligibility.ts`

**Tablas consultadas:**
- `PropertyTeam` (o `HostWorkGroupProperty` + `WorkGroupExecutor` si WorkGroups habilitado)
- `Team` (WHERE `status = 'ACTIVE'`)
- `TeamMember` (WHERE `isActive = true`)
- `TeamMemberScheduleDay` (WHERE `dayOfWeek = scheduledDate.getDay()`)

**Columnas clave:**
- `TeamMember.isActive`
- `TeamMemberScheduleDay.dayOfWeek`
- `TeamMemberScheduleDay.isWorking`

**Propósito:** Determinar qué cleaners están disponibles en el día/hora programada de la limpieza.

---

### 3.7 Alertas desde `attentionReason` (Persistido en DB)

**Fuente:** `Cleaning.needsAttention` y `Cleaning.attentionReason`

#### Códigos Posibles

- `NO_AVAILABLE_MEMBER`
- `DECLINED_BY_ASSIGNEE`
- `NO_TEAM_CONFIGURED`
- `CLEANING_PENDING_OVERDUE`
- `CLEANING_PENDING_NO_ASSIGNMENT`
- `CLEANING_ASSIGNED_NOT_AVAILABLE`
- `MANUAL_REVIEW_REQUIRED`

#### Condiciones Evaluadas

1. `cleaning.needsAttention === true`
2. `cleaning.assignedMemberId` es `null` (no hay cleaner asignado)
3. `cleaning.assignedMembershipId` es `null` (no hay membership asignado)
4. El `attentionReason` no es de configuración cuando hay equipos disponibles

#### Lógica

```typescript
if (
  cleaning.needsAttention &&
  !cleaning.assignedMemberId &&
  !cleaning.assignedMembershipId
) {
  const hasAvailableTeams = propertyTeamsCount > 0;
  const isConfigurationIssue = 
    attentionReason === "NO_TEAM_CONFIGURED" ||
    attentionReason === "NO_HOST_TEAM_CONFIG";
  
  // Solo mostrar si NO es problema de configuración cuando hay equipos
  if (!(hasAvailableTeams && isConfigurationIssue)) {
    // Mostrar alerta según attentionReason
  }
}
```

#### Tablas Consultadas

- `Cleaning` (ya cargado)
- `PropertyTeam` (para verificar `hasAvailableTeams`)

---

## 4. Determinación del Nivel de Asignación

**Archivo:** `lib/cleanings/getCleaningAssignmentLevel.ts`

### Input Requerido

- `teamId` (desde `Cleaning.teamId`)
- `assignedMembershipId` (desde `Cleaning.assignedMembershipId`)
- `assignedMemberId` (desde `Cleaning.assignedMemberId`)
- `status` (desde `Cleaning.status`)
- `startedAt` (desde `Cleaning.startedAt`)
- `completedAt` (desde `Cleaning.completedAt`)
- `hasAvailableTeams` (calculado desde `PropertyTeam` o `WorkGroupExecutor`)

### Lógica de Niveles

| Nivel | Condición | Descripción |
|-------|-----------|-------------|
| 0 | `teamId === null` AND `hasAvailableTeams === false` | Sin contexto ejecutor |
| 1 | `teamId === null` AND `hasAvailableTeams === true` | Con contexto disponible pero sin asignar |
| 2 | `teamId !== null` AND `assignedMembershipId === null` | Asignada a Team |
| 3 | `assignedMembershipId !== null` OR `assignedMemberId !== null` | Aceptada por Cleaner |
| 4 | `status === 'IN_PROGRESS'` AND `startedAt !== null` | En ejecución |
| 5 | `status === 'COMPLETED'` AND `completedAt !== null` | Completada |

### Tablas Consultadas (para `hasAvailableTeams`)

- `PropertyTeam` (WHERE `propertyId = ?`, `team.status = 'ACTIVE'`)
- O `HostWorkGroupProperty` + `WorkGroupExecutor` (si WorkGroups habilitado)

---

## 5. Resumen de Tablas y Columnas Consultadas

### Tabla: `Cleaning`

**Columnas usadas para alertas:**
- `id` (WHERE)
- `tenantId` (WHERE)
- `status` (SELECT)
- `scheduledDate` (SELECT)
- `scheduledAtPlanned` (SELECT, nullable)
- `teamId` (SELECT, nullable)
- `assignedMembershipId` (SELECT, nullable)
- `assignedMemberId` (SELECT, nullable)
- `startedAt` (SELECT, nullable)
- `completedAt` (SELECT, nullable)
- `needsAttention` (SELECT, boolean)
- `attentionReason` (SELECT, nullable)
- `propertyId` (SELECT)

---

### Tabla: `PropertyTeam` (Legacy)

**Columnas consultadas:**
- `propertyId` (WHERE)
- `tenantId` (WHERE)
- `teamId` (SELECT)

**Relaciones:**
- `team` → `id`, `name`, `status` (WHERE `status = 'ACTIVE'`)

**Propósito:** Determinar equipos disponibles para la propiedad.

---

### Tabla: `HostWorkGroupProperty` (WorkGroups)

**Columnas consultadas:**
- `propertyId` (WHERE)
- `tenantId` (WHERE)
- `workGroupId` (SELECT)

**Propósito:** Obtener WorkGroups asignados a la propiedad.

---

### Tabla: `HostWorkGroup` (WorkGroups)

**Columnas consultadas:**
- `id` (WHERE, IN)
- `tenantId` (WHERE)
- `name` (SELECT)
- `createdAt` (ORDER BY)

**Propósito:** Obtener detalles de WorkGroups.

---

### Tabla: `WorkGroupExecutor` (WorkGroups)

**Columnas consultadas:**
- `hostTenantId` (WHERE)
- `workGroupId` (WHERE, IN)
- `teamId` (SELECT)
- `status` (WHERE, debe ser "ACTIVE")
- `servicesTenantId` (SELECT)

**Propósito:** Obtener Teams ejecutores activos de WorkGroups.

---

### Tabla: `Team`

**Columnas consultadas:**
- `id` (WHERE, IN)
- `name` (SELECT)
- `status` (WHERE, debe ser "ACTIVE")

**Propósito:** Verificar que Teams estén activos.

---

### Tabla: `TeamMembership` (Moderno)

**Columnas consultadas:**
- `teamId` (WHERE, IN o WHERE =)
- `status` (WHERE, debe ser "ACTIVE")
- `role` (WHERE, debe ser "CLEANER" o "TEAM_LEADER")
- `userId` (SELECT, vía relación `User`)
- `createdAt` (ORDER BY)

**Relaciones:**
- `User` → `id`, `name`, `email`
- `Team` → `id`, `name`

**Propósito:** 
- Contar miembros activos del Team asignado
- Obtener lista de miembros para asignación
- Obtener Team Leaders para nombres de display

---

### Tabla: `TeamMember` (Legacy)

**Columnas consultadas:**
- `teamId` (WHERE, IN o WHERE =)
- `tenantId` (WHERE)
- `isActive` (WHERE, debe ser `true`)
- `name` (SELECT)
- `workingDays` (SELECT, array)

**Relaciones:**
- `team` → `id`, `name`

**Propósito:** Contar miembros legacy activos del Team asignado.

---

### Tabla: `TeamMemberScheduleDay` (Disponibilidad)

**Columnas consultadas:**
- `teamMemberId` (WHERE, vía relación)
- `tenantId` (WHERE)
- `dayOfWeek` (WHERE, debe coincidir con día de la limpieza)
- `isWorking` (SELECT, boolean)

**Propósito:** Determinar si un cleaner está disponible en el día programado de la limpieza.

---

## 6. Orden de Evaluación de Alertas

Las alertas se evalúan en el siguiente orden (prioridad):

1. **Nivel 0 (Sin contexto ejecutor):**
   - Si `propertyTeamsCount === 0` → `NO_TEAM_EXECUTING` (CRITICAL)
   - Si `propertyTeamsCount === 0` → `NO_HOST_TEAM_CONFIG` (WARNING)

2. **Nivel 2 (Asignada a Team sin miembros):**
   - Si `teamMembershipsCount === 0` → `NO_AVAILABLE_MEMBER` (CRITICAL)
   - **RETURN** (no evaluar más alertas)

3. **Alertas desde `needsAttention` flag:**
   - Si `needsAttention === true` y no hay cleaner asignado → evaluar `attentionReason`
   - Filtrar según nivel y disponibilidad de equipos

4. **Alertas dinámicas:**
   - `CLEANING_PENDING_OVERDUE` (si fecha pasada)
   - `NO_PRIMARY_ASSIGNEE` (si hay equipos pero no asignado)
   - `CLEANING_ASSIGNED_NOT_AVAILABLE` (si cleaner asignado no disponible)

---

## 7. Optimizaciones y Caching

### Consultas Paralelas

En `app/host/cleanings/[id]/page.tsx`, las siguientes consultas se ejecutan en paralelo:

```typescript
const [cleaning, propertyTeams, viewsCount, inventoryReview, assignees] = await Promise.all([
  // 1. Cleaning principal
  prisma.cleaning.findFirst(...),
  // 2. PropertyTeams
  prisma.propertyTeam.findMany(...),
  // 3. Views count
  prisma.cleaningView.count(...),
  // 4. Inventory review
  getInventoryReviewStatus(...),
  // 5. Assignees
  prisma.cleaningAssignee.findMany(...),
]);
```

### Caching de Miembros Elegibles

**Archivo:** `lib/cleaning-eligibility.ts`

La función `getEligibleMembersForCleaning` usa cache basado en:
- `tenantId`
- `propertyId`
- `dateKey` (fecha en formato YYYY-MM-DD)

**Duración del cache:** Configurable (por defecto, hasta que cambie el día).

---

## 8. Variables de Entorno

### `WORKGROUP_READS_ENABLED`

**Valor:** `"1"` o no definido

**Efecto:**
- Si `"1"`: Usa `HostWorkGroupProperty` + `WorkGroupExecutor` para determinar equipos disponibles
- Si no definido: Usa `PropertyTeam` (legacy)

**Archivos afectados:**
- `app/host/cleanings/[id]/page.tsx`
- `lib/cleaning-eligibility.ts`
- `lib/workgroups/resolveEffectiveTeamsForProperty.ts`

---

## 9. Casos Especiales

### Limpiezas Completadas o Canceladas

**Lógica:**
```typescript
if (cleaning.status === "COMPLETED" || cleaning.status === "CANCELLED") {
  return []; // No mostrar alertas
}
```

**Propósito:** Evitar alertas innecesarias en limpiezas finalizadas.

---

### Limpiezas con `teamId` pero sin `assignedMembershipId`

**Nivel:** 2 (Asignada a Team)

**Validación adicional:**
- Si `teamMembershipsCount === 0` → Alerta `NO_AVAILABLE_MEMBER`
- Si `teamMembershipsCount > 0` → Sin alerta (espera normal de aceptación)

---

### Limpiezas con equipos disponibles pero sin asignar

**Nivel:** 1 (Con contexto disponible pero sin asignar)

**Comportamiento:**
- NO muestra alerta por defecto (asignación pendiente normal)
- SOLO muestra alerta si `needsAttention === true` y `attentionReason` es problema operativo (no de configuración)

---

## 10. Referencias

- **Contratos:**
  - `docs/contracts/CLEANING_ASSIGNMENT_V1.md`
  - `docs/contracts/CLEANING_DETAIL_UX_V1.md`

- **Archivos de código:**
  - `lib/cleanings/getCleaningAssignmentLevel.ts`
  - `lib/cleanings/getCleaningAttention.ts`
  - `lib/cleaning-attention-reasons.ts`
  - `app/host/cleanings/[id]/page.tsx`
  - `lib/cleaning-eligibility.ts`
  - `lib/workgroups/resolveEffectiveTeamsForProperty.ts`

---

## 11. Notas Técnicas

### Compatibilidad Legacy

El sistema mantiene compatibilidad con:
- `TeamMember` (legacy) además de `TeamMembership` (moderno)
- `PropertyTeam` (legacy) además de `WorkGroupExecutor` (moderno)

### Validación de Disponibilidad

La validación de disponibilidad (`CLEANING_ASSIGNED_NOT_AVAILABLE`) requiere:
1. Consultar `TeamMemberScheduleDay` para el día de la semana
2. Verificar `isWorking === true`
3. Fallback a `workingDays` array si no hay `scheduleDay` configurado

### Manejo de Errores

- Si `cleaningAssignee` no existe → retorna array vacío (no falla)
- Si `getEligibleMembersForCleaning` falla → no agrega alerta (evita errores en UI)

---

**Fin del Informe**

