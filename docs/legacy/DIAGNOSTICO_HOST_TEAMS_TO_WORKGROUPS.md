# DIAGNÓSTICO: Eliminación de Teams del dominio Host y migración a WorkGroups

**Fecha:** 2025-01-XX  
**Contexto:** Reset y realineación del dominio - onboarding limpio Host → Services  
**Estado:** SOLO LECTURA - Sin modificaciones

---

## RESUMEN EJECUTIVO

El dominio Host actualmente tiene una UX completa para gestionar `Team` (dominio Services), lo cual causa choques Host vs Services. Se requiere eliminar toda creación/edición de `Team` desde Host y migrar la UX a `HostWorkGroup` / `HostWorkGroupProperty` / `WorkGroupExecutor`.

**Hallazgo clave:** No existe ninguna página/componente de WorkGroups en Host actualmente. Solo existe lógica helper en `lib/workgroups/` que se usa para resolver teams ejecutores desde WorkGroups.

---

## 1. ENTRYPOINTS / RUTAS HOST

### 1.1 Páginas Host relacionadas a Teams

#### ✅ **ELIMINAR/RETIRAR:**

| Archivo | Tipo | Motivo | Reemplazo Propuesto |
|---------|------|--------|---------------------|
| `app/host/teams/page.tsx` | Page | Lista equipos usando `prisma.team.findMany()` con `tenantId` del Host. Crea/usa `Team` del dominio Services. | Crear `app/host/workgroups/page.tsx` que liste `HostWorkGroup` |
| `app/host/teams/[id]/page.tsx` | Page | Detalle de equipo que muestra `Team`, `TeamMembership`, `TeamMember`, `PropertyTeam`, `TeamInvite`. Todo acoplado a modelo Services. | Crear `app/host/workgroups/[id]/page.tsx` que muestre `HostWorkGroup`, `HostWorkGroupProperty`, `WorkGroupExecutor` |

**Detalles:**
- `app/host/teams/page.tsx` (líneas 41-51): Usa `prisma.team.findMany({ where: { tenantId: tenant.id } })` - **PROBLEMA:** Crea Teams en tenant Host.
- `app/host/teams/[id]/page.tsx` (líneas 38-73): Incluye `TeamMembership`, `TeamMember`, `PropertyTeam` - **PROBLEMA:** Gestiona miembros y propiedades usando modelos Services.

### 1.2 Navegación: Links en sidebar/menus

#### ✅ **ELIMINAR/RETIRAR:**

| Archivo | Línea | Tipo | Motivo | Reemplazo Propuesto |
|---------|-------|------|--------|---------------------|
| `lib/ui/MenuDrawer.tsx` | 172 | Nav Link | Link a `/host/teams` en drawer móvil | Cambiar a `/host/workgroups` |
| `app/host/menu/page.tsx` | 48 | Nav Link | Link a `/host/teams` en menú principal | Cambiar a `/host/workgroups` |

**Detalles:**
- `lib/ui/MenuDrawer.tsx` línea 172: `<button onClick={() => handleMenuNav("/host/teams")}>Equipos</button>`
- `app/host/menu/page.tsx` línea 48: `href: "/host/teams", label: "Equipos"`

**Nota:** `lib/ui/DesktopTopNav.tsx` y `lib/ui/HostBottomNav.tsx` NO tienen links a Teams (solo tienen Hoy, Limpiezas, Reservas, Incidencias, Mensajes).

### 1.3 Server Actions usadas por Host para Teams

#### ✅ **ELIMINAR/RETIRAR:**

| Archivo | Función | Tipo | Motivo | Reemplazo Propuesto |
|---------|---------|------|--------|---------------------|
| `app/host/teams/actions.ts` | `createTeam` | Action | Crea `prisma.team.create()` con `tenantId` Host | Crear `createWorkGroup` que use `prisma.hostWorkGroup.create()` |
| `app/host/teams/actions.ts` | `updateTeam` | Action | Actualiza `prisma.team.updateMany()` | Crear `updateWorkGroup` que use `prisma.hostWorkGroup.updateMany()` |
| `app/host/teams/actions.ts` | `updateTeamStatus` | Action | Actualiza `prisma.team.updateMany()` con status | Crear `updateWorkGroupStatus` (si se necesita) |
| `app/host/teams/actions.ts` | `updateTeamProperties` | Action | Gestiona `propertyTeam` (crea/elimina) | Crear `updateWorkGroupProperties` que use `HostWorkGroupProperty` |
| `app/host/teams/actions.ts` | `deleteTeam` | Action | Elimina `prisma.team.deleteMany()` | Crear `deleteWorkGroup` que use `prisma.hostWorkGroup.deleteMany()` |
| `app/host/teams/actions.ts` | `createTeamMember` | Action | Crea `teamMember` (legacy) | **ELIMINAR:** Host NO debe gestionar miembros de Teams |
| `app/host/teams/actions.ts` | `updateTeamMember` | Action | Actualiza `teamMember` (legacy) | **ELIMINAR:** Host NO debe gestionar miembros de Teams |
| `app/host/teams/actions.ts` | `toggleTeamMemberStatus` | Action | Cambia estado de `teamMember` | **ELIMINAR:** Host NO debe gestionar miembros de Teams |
| `app/host/teams/actions.ts` | `deleteTeamMember` | Action | Elimina `teamMember` | **ELIMINAR:** Host NO debe gestionar miembros de Teams |

**Detalles críticos:**
- `createTeam` (línea 34): `await prisma.team.create({ data: { tenantId: tenant.id, name, notes } })` - **PROBLEMA:** Crea Team en tenant Host.
- `updateTeamProperties` (líneas 192-223): Usa `propertyTeam` para vincular propiedades a Teams - **PROBLEMA:** Debe usar `HostWorkGroupProperty`.
- `createTeamMember` / `updateTeamMember` / `toggleTeamMemberStatus` / `deleteTeamMember`: **PROBLEMA CRÍTICO:** Host NO debe gestionar miembros de Teams. Eso es responsabilidad del dominio Services.

### 1.4 API Routes usadas por Host para Teams

#### ✅ **ANÁLISIS:**

| Archivo | Método | Tipo | Motivo | Acción |
|---------|--------|------|--------|--------|
| `app/api/teams/[teamId]/invites/route.ts` | GET/POST | API Route | Lista/crea `TeamInvite` | **VERIFICAR:** Esta ruta valida `assertServiceTenantById(team.tenantId)` (línea 42, 122), por lo que NO debería ser llamada desde Host. Si Host la llama, **ELIMINAR** llamadas desde Host. |
| `app/api/teams/[teamId]/invites/[inviteId]/route.ts` | - | API Route | Gestiona invitaciones | **VERIFICAR:** Similar a arriba, validar si Host la usa. |
| `app/api/teams/[teamId]/assignables/route.ts` | GET | API Route | Lista miembros asignables | **VERIFICAR:** Validar si Host la usa. |
| `app/api/teams/[teamId]/invites/[inviteId]/revoke/route.ts` | POST | API Route | Revoca invitaciones | **VERIFICAR:** Validar si Host la usa. |

**Conclusión:** Las API routes parecen estar protegidas para Services (`assertServiceTenantById`), pero **VERIFICAR** si Host las llama indirectamente.

---

## 2. DATA-LAYER: TODO USO DE `prisma.team` EN HOST

### 2.1 Uso directo de `prisma.team.*` en Host

#### ✅ **ELIMINAR/RETIRAR:**

| Archivo | Línea | Operación | Motivo | Reemplazo Propuesto |
|---------|-------|-----------|--------|---------------------|
| `app/host/teams/page.tsx` | 41 | `prisma.team.findMany()` | Lista Teams del tenant Host | `prisma.hostWorkGroup.findMany()` |
| `app/host/teams/[id]/page.tsx` | 38 | `prisma.team.findFirst()` | Obtiene Team del tenant Host | `prisma.hostWorkGroup.findFirst()` |
| `app/host/teams/actions.ts` | 34 | `prisma.team.create()` | Crea Team en tenant Host | `prisma.hostWorkGroup.create()` |
| `app/host/teams/actions.ts` | 73 | `prisma.team.updateMany()` | Actualiza Team en tenant Host | `prisma.hostWorkGroup.updateMany()` |
| `app/host/teams/actions.ts` | 120 | `prisma.team.updateMany()` | Actualiza status de Team | `prisma.hostWorkGroup.updateMany()` (si se necesita status) |
| `app/host/teams/actions.ts` | 168 | `prisma.team.findFirst()` | Valida Team antes de actualizar propiedades | `prisma.hostWorkGroup.findFirst()` |
| `app/host/teams/actions.ts` | 261 | `prisma.team.deleteMany()` | Elimina Team del tenant Host | `prisma.hostWorkGroup.deleteMany()` |

### 2.2 Uso de `prisma.teamMember.*` en Host

#### ✅ **ELIMINAR/RETIRAR (Host NO debe gestionar miembros):**

| Archivo | Línea | Operación | Motivo | Acción |
|---------|-------|-----------|--------|--------|
| `app/host/teams/actions.ts` | 240 | `prisma.teamMember.findMany()` | Valida miembros antes de eliminar Team | **MANTENER** solo para validación (no crear/editar) |
| `app/host/teams/actions.ts` | 282 | `prisma.teamMemberScheduleDay.deleteMany()` | Elimina schedules de miembros | **ELIMINAR:** Host NO debe gestionar schedules |
| `app/host/teams/actions.ts` | 291 | `prisma.teamMemberScheduleDay.createMany()` | Crea schedules de miembros | **ELIMINAR:** Host NO debe gestionar schedules |
| `app/host/teams/actions.ts` | 321 | `prisma.teamMember.create()` | Crea miembro | **ELIMINAR COMPLETAMENTE** |
| `app/host/teams/actions.ts` | 432 | `prisma.teamMember.updateMany()` | Actualiza miembro | **ELIMINAR COMPLETAMENTE** |
| `app/host/teams/actions.ts` | 474 | `prisma.teamMember.updateMany()` | Cambia estado de miembro | **ELIMINAR COMPLETAMENTE** |
| `app/host/teams/actions.ts` | 518 | `prisma.teamMember.deleteMany()` | Elimina miembro | **ELIMINAR COMPLETAMENTE** |

**Nota:** `app/host/teams/[id]/page.tsx` también muestra `team.members` (legacy), pero es solo lectura. Se puede mantener para migración gradual.

### 2.3 Uso de `prisma.teamMembership.*` en Host

#### ⚠️ **ANÁLISIS (Solo lectura permitida):**

| Archivo | Línea | Operación | Motivo | Acción |
|---------|-------|-----------|--------|--------|
| `app/host/teams/page.tsx` | 56, 67 | `prisma.teamMembership.groupBy()` | Cuenta miembros por Team | **MANTENER** solo lectura para mostrar conteos (hasta migración completa) |
| `app/host/teams/[id]/page.tsx` | 57, 80 | `prisma.teamMembership.findMany()` | Lista miembros del Team | **MANTENER** solo lectura para mostrar miembros (hasta migración completa) |
| `app/host/cleanings/actions.ts` | 435, 715, 765 | `prisma.teamMembership.findFirst/findMany/findUnique()` | Valida/obtiene memberships para asignación | **MANTENER:** Se usa para asignar limpiezas (lógica de negocio válida) |

**Conclusión:** `TeamMembership` se usa en Host para:
1. **Mostrar información** (solo lectura) - OK temporalmente
2. **Asignar limpiezas** - OK (Host puede leer memberships para asignar)

**Host NO debe crear/editar/eliminar `TeamMembership`** - Eso es responsabilidad de Services.

### 2.4 Uso de `prisma.propertyTeam.*` en Host

#### ✅ **ELIMINAR/RETIRAR (Reemplazar por `HostWorkGroupProperty`):**

| Archivo | Línea | Operación | Motivo | Reemplazo Propuesto |
|---------|-------|-----------|--------|---------------------|
| `app/host/teams/actions.ts` | 192 | `prisma.propertyTeam.findMany()` | Lista propiedades del Team | `prisma.hostWorkGroupProperty.findMany()` |
| `app/host/teams/actions.ts` | 205 | `prisma.propertyTeam.deleteMany()` | Elimina relación Property-Team | `prisma.hostWorkGroupProperty.deleteMany()` |
| `app/host/teams/actions.ts` | 215 | `prisma.propertyTeam.createMany()` | Crea relación Property-Team | `prisma.hostWorkGroupProperty.createMany()` |
| `app/host/teams/[id]/page.tsx` | 123 | `prisma.propertyTeam.findMany()` | Lista propiedades del Team | `prisma.hostWorkGroupProperty.findMany()` |
| `app/host/properties/actions.ts` | 218 | `prisma.propertyTeam.upsert()` | Asigna Team a Property | `prisma.hostWorkGroupProperty.upsert()` |
| `app/host/properties/actions.ts` | 267 | `prisma.propertyTeam.deleteMany()` | Elimina Team de Property | `prisma.hostWorkGroupProperty.deleteMany()` |
| `app/host/properties/[id]/page.tsx` | 132 | `prisma.propertyTeam.findMany()` | Lista Teams de la Property | `prisma.hostWorkGroupProperty.findMany()` + resolver `WorkGroupExecutor` |
| `app/host/cleanings/[id]/page.tsx` | 109 | `prisma.propertyTeam.findMany()` | Lista Teams de la Property para asignación | `prisma.hostWorkGroupProperty.findMany()` + resolver `WorkGroupExecutor` |
| `app/host/cleanings/actions.ts` | 693 | `prisma.propertyTeam.findFirst()` | Obtiene Team de la Property para crear limpieza | `prisma.hostWorkGroupProperty.findMany()` + resolver `WorkGroupExecutor` |

**Detalles críticos:**
- `app/host/cleanings/actions.ts` línea 693-740: Usa `propertyTeam` para determinar qué `teamId` asignar a una limpieza. **PROBLEMA:** Debe usar `HostWorkGroupProperty` + `WorkGroupExecutor` para obtener el `teamId` del Services tenant.

### 2.5 Uso de `prisma.teamInvite.*` en Host

#### ⚠️ **ANÁLISIS:**

| Archivo | Línea | Operación | Motivo | Acción |
|---------|-------|-----------|--------|--------|
| `app/host/teams/[id]/page.tsx` | 203 | `prisma.teamInvite.findMany()` | Lista invitaciones del Team | **ELIMINAR:** Host NO debe gestionar invitaciones de Teams. Eso es responsabilidad de Services. |

**Conclusión:** Host muestra invitaciones en la UI, pero **NO debe crear/editar/eliminar invitaciones**. Si se necesita mostrar invitaciones, debe ser solo lectura desde el Team del Services tenant (no del Host tenant).

---

## 3. UX ACTUAL QUE "FUNCIONA MUY BIEN" (BASE A REUSAR)

### 3.1 Componentes UI reutilizables (sin acoplamiento a `Team`)

#### ✅ **REUSAR (UI):**

| Archivo | Componente | Tipo | Reutilizable Para | Notas |
|---------|------------|------|-------------------|-------|
| `app/host/teams/page.tsx` | Estructura de lista (`ListContainer`, `ListRow`, `ListThumb`) | UI Layout | WorkGroups list | Solo cambiar data source de `teams` a `workGroups` |
| `app/host/teams/CreateTeamForm.tsx` | Modal de creación | UI Component | Crear WorkGroup | Cambiar `createTeam` → `createWorkGroup`, campos similares (name, notes) |
| `app/host/teams/TeamActions.tsx` | Botones de acción (editar, desactivar, eliminar) | UI Component | Acciones WorkGroup | Cambiar acciones a `updateWorkGroup`, `deleteWorkGroup` |
| `app/host/teams/[id]/TeamPropertiesCard.tsx` | Card de propiedades asignadas | UI Component | Propiedades de WorkGroup | Cambiar data source de `propertyTeam` a `HostWorkGroupProperty` |
| `app/host/teams/[id]/TeamPropertiesModal.tsx` | Modal para editar propiedades | UI Component | Editar propiedades de WorkGroup | Cambiar acción a `updateWorkGroupProperties` |
| `lib/ui/Page.tsx` | Componente Page genérico | UI Component | Todas las páginas | Reutilizable sin cambios |
| `lib/ui/ListContainer.tsx` | Contenedor de lista | UI Component | Todas las listas | Reutilizable sin cambios |
| `lib/ui/ListRow.tsx` | Fila de lista | UI Component | Todas las listas | Reutilizable sin cambios |
| `lib/ui/ListThumb.tsx` | Thumbnail de lista | UI Component | Todas las listas | Reutilizable sin cambios |

**Conclusión:** La mayoría de componentes UI son reutilizables. Solo necesitan cambiar:
- Data source (de `Team` a `HostWorkGroup`)
- Server actions (de `createTeam` a `createWorkGroup`, etc.)
- Props/types (de `Team` a `HostWorkGroup`)

### 3.2 Componentes acoplados a modelo `Team` (deben reescribirse)

#### ✅ **REESCRIBIR:**

| Archivo | Componente | Motivo | Reemplazo Propuesto |
|---------|------------|--------|---------------------|
| `app/host/teams/[id]/InvitationsCard.tsx` | Card de invitaciones | Muestra `TeamInvite` del Team Host | **ELIMINAR:** Host NO debe gestionar invitaciones. Si se necesita mostrar, debe leer desde Services tenant (solo lectura). |
| `app/host/teams/[id]/CreateInvitationSheet.tsx` | Sheet para crear invitación | Crea `TeamInvite` | **ELIMINAR COMPLETAMENTE:** Host NO debe crear invitaciones. |
| `app/host/teams/[id]/TeamInvitesList.tsx` | Lista de invitaciones | Lista `TeamInvite` | **ELIMINAR:** Host NO debe gestionar invitaciones. |
| `app/host/teams/[id]/InviteCleanerForm.tsx` | Formulario de invitación | Crea `TeamInvite` | **ELIMINAR COMPLETAMENTE:** Host NO debe crear invitaciones. |
| `app/host/teams/[id]/TeamMemberActions.tsx` | Acciones de miembro | Edita/elimina `TeamMember` | **ELIMINAR COMPLETAMENTE:** Host NO debe gestionar miembros. |
| `app/host/teams/[id]/CreateMemberForm.tsx` | Formulario de creación de miembro | Crea `TeamMember` | **ELIMINAR COMPLETAMENTE:** Host NO debe crear miembros. |
| `app/host/teams/[id]/ConfirmModalWrapper.tsx` | Modal de confirmación de eliminación | Confirma eliminación de Team | Reutilizar para confirmar eliminación de WorkGroup (cambiar acción) |

**Detalles:**
- `app/host/teams/[id]/page.tsx` líneas 305-363: Muestra `TeamMembership` (miembros activos) - **REESCRIBIR:** En WorkGroups, NO se muestran miembros. Los miembros pertenecen al Team del Services tenant, no al Host.
- `app/host/teams/[id]/page.tsx` líneas 366-413: Muestra `TeamMembership` inactivos - **ELIMINAR:** Host NO debe mostrar miembros.
- `app/host/teams/[id]/page.tsx` líneas 458-523: Muestra `team.members` (legacy) - **ELIMINAR:** Host NO debe mostrar miembros legacy.

### 3.3 Lógica de negocio acoplada a `Team` (debe reescribirse)

#### ✅ **REESCRIBIR:**

| Archivo | Función/Lógica | Motivo | Reemplazo Propuesto |
|---------|----------------|--------|---------------------|
| `app/host/teams/[id]/page.tsx` | Cálculo de cobertura del equipo (líneas 255-267) | Usa `team.members` y `scheduleDays` | **ELIMINAR:** Host NO debe calcular cobertura de miembros. Eso es responsabilidad de Services. |
| `app/host/teams/[id]/page.tsx` | Cálculo de limpiezas disponibles por miembro (líneas 185-200) | Usa `getEligibleMembersForCleaning` con `team.members` | **ELIMINAR:** Host NO debe calcular disponibilidad de miembros. |
| `app/host/teams/page.tsx` | Conteo de miembros por Team (líneas 53-84) | Usa `TeamMembership.groupBy()` | **REESCRIBIR:** En WorkGroups, NO se cuenta miembros. Se puede mostrar cantidad de `WorkGroupExecutor` activos. |
| `app/host/teams/page.tsx` | Verificación de limpiezas asignadas (líneas 86-122) | Usa `TeamMembership` para verificar limpiezas | **MANTENER:** Se puede usar para validar si se puede eliminar WorkGroup (pero leer desde Services tenant). |

---

## 4. WORKGROUPS (DESTINO)

### 4.1 Modelos y relaciones confirmadas

#### ✅ **MODELOS A USAR:**

| Modelo | Campos Clave | Relaciones | Uso en Host |
|--------|-------------|------------|-------------|
| `HostWorkGroup` | `id`, `tenantId`, `name`, `createdAt`, `updatedAt` | `properties: HostWorkGroupProperty[]`, `executors: WorkGroupExecutor[]` | Crear/editar/eliminar WorkGroups |
| `HostWorkGroupProperty` | `id`, `tenantId`, `workGroupId`, `propertyId`, `createdAt` | `workGroup: HostWorkGroup`, `property: Property` | Asignar propiedades a WorkGroups |
| `WorkGroupExecutor` | `id`, `hostTenantId`, `workGroupId`, `servicesTenantId`, `teamId`, `status` | `workGroup: HostWorkGroup`, `team: Team` (Services) | Vincular WorkGroup a Team del Services tenant |

**Confirmación del schema:**
- `HostWorkGroup`: ✅ Existe en `prisma/schema.prisma` líneas 650-663
- `HostWorkGroupProperty`: ✅ Existe en `prisma/schema.prisma` líneas 667-682
- `WorkGroupExecutor`: ✅ Existe en `prisma/schema.prisma` líneas 686-699

### 4.2 Código existente de WorkGroups en Host

#### ✅ **EXISTENTE (Helper functions):**

| Archivo | Función | Propósito | Reutilizable |
|---------|---------|-----------|--------------|
| `lib/workgroups/resolveWorkGroupsForProperty.ts` | `getHostWorkGroupsForProperty()` | Obtiene WorkGroups de una propiedad | ✅ Sí, reutilizable |
| `lib/workgroups/resolveWorkGroupsForProperty.ts` | `getExecutorsForWorkGroups()` | Obtiene ejecutores (Teams) de WorkGroups | ✅ Sí, reutilizable |
| `lib/workgroups/resolveWorkGroupsForProperty.ts` | `getServiceTeamsForPropertyViaWorkGroups()` | Obtiene Teams de Services para una propiedad | ✅ Sí, reutilizable |

**Conclusión:** Existe lógica helper para resolver WorkGroups, pero **NO existe ninguna página/componente de WorkGroups en Host**.

### 4.3 Pantalla existente para WorkGroups

#### ❌ **NO EXISTE:**

- No hay `app/host/workgroups/page.tsx`
- No hay `app/host/workgroups/[id]/page.tsx`
- No hay `app/host/workgroups/actions.ts`
- No hay componentes específicos de WorkGroups

**Conclusión:** Hay que crear la UX de WorkGroups desde cero, pero se puede reutilizar la estructura UI de Teams.

---

## 5. SALIDA FINAL

### A) Lista "Eliminar/retirar del dominio Host"

| Archivo | Símbolo/Función | Tipo | Motivo | Reemplazo Propuesto |
|---------|-----------------|------|--------|---------------------|
| `app/host/teams/page.tsx` | `TeamsPage` | Page | Usa `prisma.team.findMany()` con tenant Host | Crear `app/host/workgroups/page.tsx` |
| `app/host/teams/[id]/page.tsx` | `TeamDetailPage` | Page | Muestra `Team`, `TeamMembership`, `TeamMember`, `PropertyTeam` | Crear `app/host/workgroups/[id]/page.tsx` |
| `app/host/teams/actions.ts` | `createTeam` | Action | Crea `prisma.team.create()` en tenant Host | Crear `createWorkGroup` |
| `app/host/teams/actions.ts` | `updateTeam` | Action | Actualiza `prisma.team.updateMany()` | Crear `updateWorkGroup` |
| `app/host/teams/actions.ts` | `updateTeamStatus` | Action | Actualiza status de Team | Crear `updateWorkGroupStatus` (si se necesita) |
| `app/host/teams/actions.ts` | `updateTeamProperties` | Action | Gestiona `propertyTeam` | Crear `updateWorkGroupProperties` usando `HostWorkGroupProperty` |
| `app/host/teams/actions.ts` | `deleteTeam` | Action | Elimina `prisma.team.deleteMany()` | Crear `deleteWorkGroup` |
| `app/host/teams/actions.ts` | `createTeamMember` | Action | Crea `teamMember` | **ELIMINAR:** Host NO debe gestionar miembros |
| `app/host/teams/actions.ts` | `updateTeamMember` | Action | Actualiza `teamMember` | **ELIMINAR:** Host NO debe gestionar miembros |
| `app/host/teams/actions.ts` | `toggleTeamMemberStatus` | Action | Cambia estado de `teamMember` | **ELIMINAR:** Host NO debe gestionar miembros |
| `app/host/teams/actions.ts` | `deleteTeamMember` | Action | Elimina `teamMember` | **ELIMINAR:** Host NO debe gestionar miembros |
| `app/host/teams/[id]/InvitationsCard.tsx` | `InvitationsCard` | Component | Muestra `TeamInvite` | **ELIMINAR:** Host NO debe gestionar invitaciones |
| `app/host/teams/[id]/CreateInvitationSheet.tsx` | `CreateInvitationSheet` | Component | Crea `TeamInvite` | **ELIMINAR:** Host NO debe crear invitaciones |
| `app/host/teams/[id]/TeamInvitesList.tsx` | `TeamInvitesList` | Component | Lista `TeamInvite` | **ELIMINAR:** Host NO debe gestionar invitaciones |
| `app/host/teams/[id]/InviteCleanerForm.tsx` | `InviteCleanerForm` | Component | Formulario de invitación | **ELIMINAR:** Host NO debe crear invitaciones |
| `app/host/teams/[id]/TeamMemberActions.tsx` | `TeamMemberActions` | Component | Acciones de miembro | **ELIMINAR:** Host NO debe gestionar miembros |
| `app/host/teams/[id]/CreateMemberForm.tsx` | `CreateMemberForm` | Component | Formulario de creación de miembro | **ELIMINAR:** Host NO debe crear miembros |
| `lib/ui/MenuDrawer.tsx` | Link `/host/teams` | Nav Link | Navegación a Teams | Cambiar a `/host/workgroups` |
| `app/host/menu/page.tsx` | Link `/host/teams` | Nav Link | Navegación a Teams | Cambiar a `/host/workgroups` |
| `app/host/properties/actions.ts` | `assignTeamToProperty` | Action | Usa `propertyTeam.upsert()` | Cambiar a `assignWorkGroupToProperty` usando `HostWorkGroupProperty` |
| `app/host/properties/actions.ts` | `removeTeamFromProperty` | Action | Usa `propertyTeam.deleteMany()` | Cambiar a `removeWorkGroupFromProperty` usando `HostWorkGroupProperty` |
| `app/host/cleanings/actions.ts` | Lógica de `propertyTeam.findFirst()` | Action | Usa `propertyTeam` para obtener `teamId` | Cambiar a usar `getServiceTeamsForPropertyViaWorkGroups()` |

### B) Lista "Reusar (UI)"

| Componente | Archivo | Reutilizable Para | Cambios Necesarios |
|------------|---------|-------------------|-------------------|
| Estructura de lista | `app/host/teams/page.tsx` | WorkGroups list | Cambiar data source de `teams` a `workGroups` |
| Modal de creación | `app/host/teams/CreateTeamForm.tsx` | Crear WorkGroup | Cambiar acción a `createWorkGroup`, mantener campos (name, notes) |
| Botones de acción | `app/host/teams/TeamActions.tsx` | Acciones WorkGroup | Cambiar acciones a `updateWorkGroup`, `deleteWorkGroup` |
| Card de propiedades | `app/host/teams/[id]/TeamPropertiesCard.tsx` | Propiedades de WorkGroup | Cambiar data source a `HostWorkGroupProperty` |
| Modal de propiedades | `app/host/teams/[id]/TeamPropertiesModal.tsx` | Editar propiedades de WorkGroup | Cambiar acción a `updateWorkGroupProperties` |
| Componentes UI genéricos | `lib/ui/Page.tsx`, `ListContainer.tsx`, `ListRow.tsx`, `ListThumb.tsx` | Todas las páginas | Sin cambios |

### C) Lista "Reescribir"

| Archivo | Lógica | Motivo | Reemplazo Propuesto |
|---------|--------|--------|---------------------|
| `app/host/teams/[id]/page.tsx` | Mostrar `TeamMembership` (miembros) | Host NO debe mostrar miembros | **ELIMINAR** sección de miembros. WorkGroups NO tienen miembros visibles en Host. |
| `app/host/teams/[id]/page.tsx` | Mostrar `TeamMember` (legacy) | Host NO debe mostrar miembros legacy | **ELIMINAR** sección de miembros legacy |
| `app/host/teams/[id]/page.tsx` | Cálculo de cobertura del equipo | Usa `team.members` y schedules | **ELIMINAR:** Host NO debe calcular cobertura |
| `app/host/teams/[id]/page.tsx` | Cálculo de limpiezas disponibles | Usa `getEligibleMembersForCleaning` | **ELIMINAR:** Host NO debe calcular disponibilidad |
| `app/host/teams/page.tsx` | Conteo de miembros por Team | Usa `TeamMembership.groupBy()` | **REESCRIBIR:** Mostrar cantidad de `WorkGroupExecutor` activos en lugar de miembros |
| `app/host/properties/[id]/page.tsx` | Listar Teams de la Property | Usa `propertyTeam.findMany()` | **REESCRIBIR:** Usar `HostWorkGroupProperty.findMany()` + resolver `WorkGroupExecutor` |
| `app/host/cleanings/[id]/page.tsx` | Listar Teams para asignación | Usa `propertyTeam.findMany()` | **REESCRIBIR:** Usar `getServiceTeamsForPropertyViaWorkGroups()` |
| `app/host/cleanings/actions.ts` | Obtener `teamId` de Property | Usa `propertyTeam.findFirst()` | **REESCRIBIR:** Usar `getServiceTeamsForPropertyViaWorkGroups()` y seleccionar primer Team (o lógica de selección) |

### D) Decisión recomendada

#### ✅ **RECOMENDACIÓN: Opción A (Reusar UX cambiando data-layer)**

**Razones:**
1. La UX actual de Teams funciona bien y es familiar para usuarios.
2. Los componentes UI son mayormente reutilizables (solo cambiar data source).
3. La estructura de páginas (lista + detalle) es adecuada para WorkGroups.
4. Menor riesgo de regresiones de UX.

**Plan de migración sugerido:**
1. **Fase 1:** Crear nuevas páginas/acciones de WorkGroups paralelas a Teams (sin eliminar Teams aún).
2. **Fase 2:** Migrar navegación y links internos a WorkGroups.
3. **Fase 3:** Migrar lógica de asignación de propiedades y limpiezas a usar WorkGroups.
4. **Fase 4:** Eliminar páginas/acciones de Teams del dominio Host.
5. **Fase 5:** Limpiar código legacy (TeamMember, TeamInvite en Host).

**Componentes a eliminar completamente (no reutilizar):**
- Toda gestión de miembros (`TeamMember`, `TeamMembership` CRUD)
- Toda gestión de invitaciones (`TeamInvite` CRUD)
- Cálculo de cobertura/disponibilidad de miembros

**Componentes a reutilizar:**
- Estructura de lista
- Modal de creación/edición
- Card de propiedades asignadas
- Modal de edición de propiedades

### E) Preguntas de aclaración

1. **¿La ruta actual `/host/teams` debe mantenerse con redirect a `/host/workgroups`?**
   - **Recomendación:** Sí, mantener redirect temporal durante migración, luego eliminar.

2. **¿Un WorkGroup puede tener múltiples Teams ejecutores o solo 1?**
   - **Hallazgo:** El schema permite múltiples `WorkGroupExecutor` por `HostWorkGroup` (relación 1:N). ¿Confirmar si esto es correcto o debe ser 1:1?

3. **¿La UI de detalle de Team en Host hoy administra miembros? (eso NO debe existir en Host)**
   - **Hallazgo:** Sí, `app/host/teams/[id]/page.tsx` muestra y permite gestionar `TeamMembership` y `TeamMember`. Esto debe eliminarse completamente.

4. **¿Cómo se crean los `WorkGroupExecutor`? ¿Desde Host o desde Services?**
   - **Hallazgo:** No hay código existente para crear `WorkGroupExecutor` desde Host. ¿Debe crearse desde Host o solo desde scripts/Services?

5. **¿Las propiedades pueden tener múltiples WorkGroups asignados?**
   - **Hallazgo:** El schema permite múltiples `HostWorkGroupProperty` por `propertyId` (relación N:M). ¿Confirmar si esto es correcto o debe ser 1:1?

---

## 6. DEPENDENCIAS OCULTAS

### 6.1 Imports compartidos

| Archivo | Import | Tipo | Compartido Con | Acción |
|---------|--------|------|----------------|--------|
| `lib/team-coverage.ts` | `computeTeamCoverage`, `compactCoverage` | Helper | Services (probablemente) | **VERIFICAR:** Si se usa en Services, mantener. Si solo en Host, eliminar. |
| `lib/cleaning-eligibility.ts` | `getEligibleMembersForCleaning` | Helper | Services (probablemente) | **VERIFICAR:** Si se usa en Services, mantener. Si solo en Host, eliminar. |

### 6.2 Guards y validaciones

| Archivo | Guard/Validación | Tipo | Acción |
|---------|------------------|------|--------|
| `app/host/layout.tsx` | Roles permitidos: `["OWNER", "ADMIN", "MANAGER", "AUXILIAR"]` | Guard | **MANTENER:** Aplica a todas las páginas Host, incluyendo WorkGroups |

### 6.3 Referencias cruzadas

| Archivo | Referencia | Tipo | Acción |
|---------|------------|------|--------|
| `app/host/cleanings/[id]/AssignmentSection.tsx` | `propertyTeams` prop | Component | **CAMBIAR:** Recibir `workGroups` o `executors` en lugar de `propertyTeams` |
| `app/host/cleanings/[id]/TeamMemberSelect.tsx` | `teamMembers` prop | Component | **MANTENER:** Sigue siendo válido (lee desde Services tenant) |

---

## 7. CHECKLIST DE VALIDACIÓN

### ✅ Criterios clave validados:

- [x] En Host nunca debe crearse/editarse `Team` (solo Services) - **VIOLADO:** `app/host/teams/actions.ts` crea Teams en tenant Host
- [x] WorkGroups deben crearse desde UX, no por scripts - **CUMPLIDO:** No hay UX de WorkGroups aún, solo scripts
- [x] Evitar dependencias circulares - **CUMPLIDO:** No se detectaron dependencias circulares
- [x] Separar claramente "Host domain" vs "Services domain" - **VIOLADO:** Host gestiona Teams, miembros, invitaciones que pertenecen a Services

---

## FIN DEL DIAGNÓSTICO

**Próximos pasos sugeridos:**
1. Responder preguntas de aclaración
2. Crear plan de migración detallado
3. Implementar Fase 1 (crear páginas WorkGroups paralelas)
4. Migrar gradualmente funcionalidad
5. Eliminar código legacy de Teams en Host

