# ANÁLISIS DE IMPACTO: Migración Host Teams → WorkGroups (Garantizar NO romper Cleaners/Services)

**Fecha:** 2025-01-XX  
**Contexto:** Eliminar/reescribir UX Host de Teams sin afectar dominio Cleaner/Services  
**Estado:** SOLO LECTURA - Sin modificaciones

---

## RESUMEN EJECUTIVO

✅ **CONCLUSIÓN PRINCIPAL:** Podemos eliminar `app/host/teams/**` y reemplazar por `app/host/workgroups/**` **SIN ROMPER Cleaner/Services**, siempre que:

1. **NO eliminemos modelos/tablas compartidas** (`Team`, `TeamMembership`, `TeamInvite`, `PropertyTeam`)
2. **NO modifiquemos lógica de asignación de limpiezas** que usa `assignedMembershipId` / `assignedMemberId`
3. **Migremos `PropertyTeam` a `HostWorkGroupProperty`** gradualmente (ambos pueden coexistir temporalmente)
4. **Eliminemos creación de Teams desde Host** (ya es una violación de dominio)

**RIESGO GENERAL:** 🟢 **BAJO** (con las precauciones indicadas)

---

## A) VERIFICACIÓN DE ACOPLAMIENTOS CRUZADOS (PROHIBIDOS)

### ✅ **RESULTADO: NO HAY ACOPLAMIENTOS CRUZADOS**

**Búsquedas realizadas:**
- `grep -r "from.*host/teams|import.*host/teams" app/cleaner` → **0 resultados**
- `grep -r "from.*host/teams|import.*host/teams" lib/cleaner` → **0 resultados**
- `grep -r "from.*host/teams|import.*host/teams" lib` → **0 resultados**

**Conclusión:** Cleaner/Services **NO importa** nada de `app/host/teams/**`. Son dominios completamente separados a nivel de código.

**Imports compartidos (pero seguros):**
- `lib/ui/Page.tsx`, `lib/ui/ListContainer.tsx`, etc. → Componentes UI genéricos, seguros de compartir
- `lib/prisma` → Instancia compartida de Prisma, pero cada dominio usa sus propios queries

---

## B) CONTRATOS SERVICES/CLEANER QUE USAN Team*

### B.1 Uso de `prisma.team` en Cleaner/Services

#### ✅ **ARCHIVOS QUE USAN `prisma.team`:**

| Archivo | Línea | Operación | Flujo | Tenant Usado | Riesgo |
|---------|-------|-----------|-------|--------------|--------|
| `app/cleaner/teams/actions.ts` | 31 | `prisma.team.create()` | Crear equipo (Cleaner) | `homeTenantId` (Services) | 🟢 BAJO - Cleaner crea en su tenant |
| `app/cleaner/teams/actions.ts` | 230 | `prisma.team.updateMany()` | Actualizar status | - | 🟢 BAJO - Solo actualiza status |
| `app/cleaner/teams/[teamId]/page.tsx` | 49 | `prisma.team.findUnique()` | Detalle de equipo | - | 🟢 BAJO - Solo lectura |
| `lib/cleaner/getCleanerCleanings.ts` | 162 | `prisma.team.findUnique()` | Obtener tenant del team legacy | - | 🟢 BAJO - Solo lectura |

**Conclusión:** Cleaner crea/lee Teams en su propio tenant (Services). Host crea Teams en tenant Host (violación). **Eliminar creación desde Host NO afecta a Cleaner.**

### B.2 Uso de `prisma.teamMembership` en Cleaner/Services

#### ✅ **ARCHIVOS QUE USAN `prisma.teamMembership`:**

| Archivo | Línea | Operación | Flujo | Riesgo |
|---------|-------|-----------|-------|--------|
| `app/cleaner/teams/page.tsx` | 26 | `findMany()` | Listar teams del cleaner | 🟢 BAJO - Solo lectura |
| `app/cleaner/teams/page.tsx` | 80 | `groupBy()` | Contar miembros por team | 🟢 BAJO - Solo lectura |
| `app/cleaner/teams/[teamId]/page.tsx` | 36 | `findFirst()` | Validar acceso al team | 🟢 BAJO - Solo lectura |
| `app/cleaner/teams/[teamId]/page.tsx` | 85 | `findMany()` | Listar miembros del team | 🟢 BAJO - Solo lectura |
| `app/cleaner/teams/actions.ts` | 41 | `create()` | Crear membership al crear team | 🟢 BAJO - Cleaner crea en su tenant |
| `app/cleaner/teams/actions.ts` | 95 | `findMany()` | Validar miembros antes de asignar | 🟢 BAJO - Solo lectura |
| `app/cleaner/teams/actions.ts` | 176, 217 | `findFirst()` | Validar líder del team | 🟢 BAJO - Solo lectura |
| `app/cleaner/teams/actions.ts` | 193 | `updateMany()` | Cambiar status de membership | 🟢 BAJO - Cleaner gestiona sus memberships |
| `lib/cleaner/resolveCleanerContext.ts` | 150 | `findMany()` | Resolver contexto del cleaner | 🟢 BAJO - Solo lectura |
| `lib/cleaner/resolveCleanerContext.ts` | 382, 392, 401 | `findUnique/create/update()` | Asegurar membership | 🟢 BAJO - Cleaner gestiona sus memberships |
| `lib/cleaner/requireCleanerAccessToCleaning.ts` | 152 | `findUnique()` | Validar acceso a limpieza | 🟢 BAJO - Solo lectura |
| `lib/cleaner/getAccessibleTenantIdsForUser.ts` | 4 | `findMany()` | Obtener tenants accesibles | 🟢 BAJO - Solo lectura |
| `app/cleaner/history/page.tsx` | 42 | `findMany()` | Obtener memberships removidos | 🟢 BAJO - Solo lectura |
| `app/cleaner/cleanings/all/page.tsx` | 70 | `findMany()` | Obtener memberships removidos | 🟢 BAJO - Solo lectura |

**Conclusión:** Cleaner gestiona `TeamMembership` en su propio dominio. Host solo lee `TeamMembership` para mostrar información. **Eliminar lectura desde Host NO afecta a Cleaner.**

### B.3 Uso de `prisma.teamInvite` en Cleaner/Services

#### ✅ **ARCHIVOS QUE USAN `prisma.teamInvite`:**

| Archivo | Línea | Operación | Flujo | Riesgo |
|---------|-------|-----------|-------|--------|
| `lib/invites/claimInvite.ts` | 20 | `findUnique()` | Reclamar invitación | 🟢 BAJO - Solo lectura/update |
| `lib/invites/claimInvite.ts` | 47, 86, 96 | `findUnique/updateMany()` | Validar y reclamar invite | 🟢 BAJO - Cleaner reclama invites |
| `app/api/invites/[token]/route.ts` | - | GET | Obtener info de invite | 🟢 BAJO - API pública |
| `app/api/invites/[token]/claim/route.ts` | - | POST | Reclamar invite | 🟢 BAJO - Cleaner reclama |
| `app/join/page.tsx` | - | Client-side | UI para reclamar invite | 🟢 BAJO - Solo UI |
| `app/cleaner/teams/[teamId]/TeamInvitesList.tsx` | - | Client-side | Listar invites del team | 🟢 BAJO - Solo lectura |
| `app/cleaner/teams/InviteMemberModal.tsx` | - | Client-side | Crear invite | 🟢 BAJO - Usa API route |

**Conclusión:** Cleaner gestiona `TeamInvite` a través de API routes protegidas (`assertServiceTenantById`). Host muestra invites pero **NO debe crearlos**. **Eliminar gestión de invites desde Host NO afecta a Cleaner.**

### B.4 Uso de `prisma.propertyTeam` en Cleaner/Services

#### ⚠️ **ARCHIVOS QUE USAN `prisma.propertyTeam` (CRÍTICO):**

| Archivo | Línea | Operación | Flujo | Tenant Usado | Riesgo |
|---------|-------|-----------|-------|--------------|--------|
| `app/cleaner/page.tsx` | 215 | `findMany()` | Obtener propiedades del cleaner | `tenantIds` (Services) | 🟡 MEDIO - Determina qué propiedades ve Cleaner |
| `app/cleaner/actions.ts` | 149 | `findMany()` | Validar acceso a propiedad | `cleaning.tenantId` | 🟡 MEDIO - Valida acceso antes de aceptar limpieza |
| `app/cleaner/cleanings/available/page.tsx` | 65 | `findMany()` | Obtener propiedades disponibles | `tenantIds` (Services) | 🟡 MEDIO - Determina limpiezas disponibles |
| `app/cleaner/teams/page.tsx` | 90 | `groupBy()` | Contar propiedades por team | - | 🟢 BAJO - Solo conteo |
| `app/cleaner/teams/[teamId]/page.tsx` | 64 | `findMany()` | Listar propiedades del team | - | 🟢 BAJO - Solo lectura |
| `lib/cleaner/getCleanerCleanings.ts` | 173 | `findMany()` | Obtener propiedades del team legacy | `legacyTenantId` | 🟡 MEDIO - Determina qué limpiezas ve Cleaner |

**⚠️ RIESGO MEDIO:** `PropertyTeam` es usado por Cleaner para determinar:
1. Qué propiedades puede ver (`app/cleaner/page.tsx`)
2. Qué limpiezas puede aceptar (`app/cleaner/actions.ts`)
3. Qué limpiezas están disponibles (`app/cleaner/cleanings/available/page.tsx`)

**Migración requerida:** Cuando Host migre de `PropertyTeam` a `HostWorkGroupProperty`, debemos:
1. **Mantener `PropertyTeam`** hasta que todos los WorkGroups tengan `WorkGroupExecutor` vinculados
2. **Actualizar queries de Cleaner** para leer desde `WorkGroupExecutor` + `HostWorkGroupProperty` (o mantener ambos durante transición)

### B.5 Uso de `prisma.teamMember` (legacy) en Cleaner/Services

#### ✅ **ARCHIVOS QUE USAN `prisma.teamMember` (LEGACY):**

| Archivo | Línea | Operación | Flujo | Riesgo |
|---------|-------|-----------|-------|--------|
| `app/cleaner/cleanings/[id]/page.tsx` | 121 | `findFirst()` | Obtener TeamMember legacy | 🟢 BAJO - Solo lectura, modo legacy |
| `app/cleaner/cleanings/all/page.tsx` | 128 | `findFirst()` | Obtener TeamMember legacy | 🟢 BAJO - Solo lectura, modo legacy |
| `app/cleaner/page.tsx` | 88 | `findFirst()` | Obtener TeamMember legacy | 🟢 BAJO - Solo lectura, modo legacy |
| `app/cleaner/actions.ts` | 206, 303, 387, 449, 565 | `findFirst()` | Obtener TeamMember legacy | 🟢 BAJO - Solo lectura, modo legacy |
| `lib/cleaner/resolveCleanerContext.ts` | 209, 235, 257 | `findFirst()` | Resolver TeamMember legacy | 🟢 BAJO - Solo lectura, modo legacy |
| `lib/cleaner/getCleanerCleanings.ts` | - | - | Modo legacy | 🟢 BAJO - Solo lectura, modo legacy |

**Conclusión:** `TeamMember` es legacy y se usa solo para compatibilidad. Cleaner prioriza `TeamMembership`. **Host NO debe gestionar `TeamMember`** (ya está eliminado en Host según diagnóstico anterior).

### B.6 Uso de campos de asignación en `Cleaning`

#### ⚠️ **ARCHIVOS QUE USAN CAMPOS DE ASIGNACIÓN:**

| Archivo | Campo | Flujo | Riesgo |
|---------|-------|-------|--------|
| `app/cleaner/cleanings/[id]/page.tsx` | `assignedMembershipId`, `assignedMemberId` | Validar si cleaner puede operar limpieza | 🟡 MEDIO - Determina acceso |
| `app/cleaner/cleanings/all/page.tsx` | `assignedMembershipId`, `assignedMemberId` | Filtrar limpiezas asignadas | 🟡 MEDIO - Determina qué limpiezas ve |
| `app/cleaner/page.tsx` | `assignedMembershipId`, `assignedMemberId` | Filtrar mis limpiezas | 🟡 MEDIO - Determina qué limpiezas ve |
| `app/cleaner/actions.ts` | `assignedMembershipId`, `assignedMemberId` | Asignar/aceptar limpiezas | 🟡 MEDIO - Lógica de asignación |
| `app/cleaner/cleanings/available/page.tsx` | `assignedMembershipId`, `assignedMemberId` | Filtrar limpiezas disponibles | 🟡 MEDIO - Determina qué limpiezas ve |
| `lib/cleaner/requireCleanerAccessToCleaning.ts` | `assignedMembershipId`, `assignedMemberId` | Validar acceso | 🟡 MEDIO - Determina acceso |
| `lib/cleaner/assertCleanerCanOperateCleaning.ts` | `assignedMembershipId`, `assignedMemberId` | Validar operación | 🟡 MEDIO - Determina acceso |
| `lib/cleaner/getCleanerCleanings.ts` | `assignedMembershipId`, `assignedMemberId` | Filtrar limpiezas | 🟡 MEDIO - Determina qué limpiezas ve |

**⚠️ RIESGO MEDIO:** Los campos `assignedMembershipId` / `assignedMemberId` / `assignedTeamMemberId` son críticos para que Cleaner vea y opere limpiezas.

**Migración requerida:** Cuando Host migre a WorkGroups:
1. **NO modificar** estos campos en `Cleaning` todavía
2. **Mantener lógica actual** de asignación (Host asigna usando `teamId` del `PropertyTeam` → se resuelve a `assignedMembershipId`)
3. **Futuro:** Host puede asignar usando `WorkGroupExecutor.teamId` en lugar de `PropertyTeam.teamId` (mismo resultado)

---

## C) RUTAS Y FLOWS CRÍTICAS A NO ROMPER

### C.1 Cleaner Teams UI

#### ✅ **PÁGINAS CLEANER:**

| Ruta | Archivo | Queries Críticos | Depende de Host Teams? | Riesgo |
|------|---------|------------------|------------------------|--------|
| `/cleaner/teams` | `app/cleaner/teams/page.tsx` | `TeamMembership.findMany()`, `TeamMembership.groupBy()`, `PropertyTeam.groupBy()` | ❌ NO | 🟢 BAJO |
| `/cleaner/teams/[teamId]` | `app/cleaner/teams/[teamId]/page.tsx` | `TeamMembership.findFirst()`, `Team.findUnique()`, `PropertyTeam.findMany()`, `TeamMembership.findMany()` | ❌ NO | 🟢 BAJO |

**Conclusión:** Cleaner Teams UI es independiente de Host Teams. Usa sus propios queries con tenant Services.

### C.2 Join/Invites

#### ✅ **RUTAS DE INVITACIONES:**

| Ruta | Archivo | Depende de Host Teams? | Riesgo |
|------|---------|------------------------|--------|
| `/join` | `app/join/page.tsx` | ❌ NO | 🟢 BAJO |
| `/api/invites/[token]` | `app/api/invites/[token]/route.ts` | ❌ NO | 🟢 BAJO |
| `/api/invites/[token]/claim` | `app/api/invites/[token]/claim/route.ts` | ❌ NO | 🟢 BAJO |
| `/api/teams/[teamId]/invites` | `app/api/teams/[teamId]/invites/route.ts` | ❌ NO (protegido con `assertServiceTenantById`) | 🟢 BAJO |

**Conclusión:** Join/Invites es dominio Services. Host NO debe crear invites (ya está protegido en API routes). **Eliminar UI de invites desde Host NO afecta a Cleaner.**

### C.3 Asignación de Limpiezas

#### ⚠️ **FLUJO DE ASIGNACIÓN:**

| Archivo | Función | Lógica Actual | Depende de Host Teams? | Riesgo |
|---------|---------|---------------|------------------------|--------|
| `app/host/cleanings/actions.ts` | `createCleaning` | Usa `PropertyTeam.findFirst()` para obtener `teamId` → asigna `assignedMembershipId` | ✅ SÍ (usa PropertyTeam) | 🟡 MEDIO |
| `app/host/cleanings/actions.ts` | `assignTeamMemberToCleaning` | Asigna `assignedMembershipId` o `assignedMemberId` | ✅ SÍ (usa TeamMembership) | 🟡 MEDIO |
| `app/host/cleanings/[id]/page.tsx` | - | Muestra `PropertyTeam` para asignación | ✅ SÍ (usa PropertyTeam) | 🟡 MEDIO |

**⚠️ RIESGO MEDIO:** Host usa `PropertyTeam` para asignar limpiezas. Cuando migremos a WorkGroups:
1. **Mantener `PropertyTeam`** durante transición
2. **Actualizar `createCleaning`** para usar `getServiceTeamsForPropertyViaWorkGroups()` en lugar de `PropertyTeam.findFirst()`
3. **Mantener lógica de asignación** (`assignedMembershipId`) sin cambios

---

## D) "SAFE DELETIONS" vs "DO NOT TOUCH"

### D.1 Lista SAFE (Eliminar/Redirigir sin afectar Cleaner)

#### ✅ **ARCHIVOS SEGUROS PARA ELIMINAR:**

| Archivo | Motivo | Acción |
|---------|--------|--------|
| `app/host/teams/page.tsx` | Solo UI Host, no usado por Cleaner | Eliminar → Crear `app/host/workgroups/page.tsx` |
| `app/host/teams/[id]/page.tsx` | Solo UI Host, no usado por Cleaner | Eliminar → Crear `app/host/workgroups/[id]/page.tsx` |
| `app/host/teams/actions.ts` | Solo acciones Host, no usado por Cleaner | Reescribir → Crear `app/host/workgroups/actions.ts` |
| `app/host/teams/CreateTeamForm.tsx` | Solo UI Host | Eliminar → Crear `CreateWorkGroupForm.tsx` |
| `app/host/teams/TeamActions.tsx` | Solo UI Host | Eliminar → Crear `WorkGroupActions.tsx` |
| `app/host/teams/[id]/InvitationsCard.tsx` | Host NO debe gestionar invites | **ELIMINAR COMPLETAMENTE** |
| `app/host/teams/[id]/CreateInvitationSheet.tsx` | Host NO debe crear invites | **ELIMINAR COMPLETAMENTE** |
| `app/host/teams/[id]/TeamInvitesList.tsx` | Host NO debe listar invites | **ELIMINAR COMPLETAMENTE** |
| `app/host/teams/[id]/InviteCleanerForm.tsx` | Host NO debe crear invites | **ELIMINAR COMPLETAMENTE** |
| `app/host/teams/[id]/TeamMemberActions.tsx` | Host NO debe gestionar miembros | **ELIMINAR COMPLETAMENTE** |
| `app/host/teams/[id]/CreateMemberForm.tsx` | Host NO debe crear miembros | **ELIMINAR COMPLETAMENTE** |
| `lib/ui/MenuDrawer.tsx` (línea 172) | Link a `/host/teams` | Cambiar a `/host/workgroups` |
| `app/host/menu/page.tsx` (línea 48) | Link a `/host/teams` | Cambiar a `/host/workgroups` |

**Total:** ~13 archivos/componentes seguros para eliminar/reescribir.

### D.2 Lista DO NOT TOUCH (Tablas/Modelos/Acciones Compartidas)

#### 🔴 **NO ELIMINAR/MODIFICAR:**

| Recurso | Motivo | Uso en Cleaner |
|---------|--------|----------------|
| Tabla `Team` | Cleaner crea/gestiona Teams en Services tenant | ✅ Crítico |
| Tabla `TeamMembership` | Cleaner gestiona memberships | ✅ Crítico |
| Tabla `TeamInvite` | Cleaner crea/reclama invites | ✅ Crítico |
| Tabla `PropertyTeam` | Cleaner usa para determinar propiedades accesibles | ⚠️ Crítico (migrar gradualmente) |
| Tabla `TeamMember` (legacy) | Cleaner usa en modo legacy | 🟢 Bajo (legacy) |
| Campo `Cleaning.assignedMembershipId` | Cleaner filtra/valida limpiezas | ✅ Crítico |
| Campo `Cleaning.assignedMemberId` | Cleaner filtra/valida limpiezas (legacy) | 🟢 Bajo (legacy) |
| Campo `Cleaning.assignedTeamMemberId` | Cleaner filtra/valida limpiezas (legacy) | 🟢 Bajo (legacy) |
| Campo `Cleaning.teamId` | Cleaner puede usar para filtrar | 🟢 Bajo |
| API Routes `/api/teams/[teamId]/invites/**` | Cleaner usa para gestionar invites | ✅ Crítico |
| API Routes `/api/invites/**` | Cleaner usa para reclamar invites | ✅ Crítico |
| `lib/invites/claimInvite.ts` | Cleaner usa para reclamar invites | ✅ Crítico |
| `lib/teams/getTeamInvites.ts` | Cleaner usa para listar invites | ✅ Crítico |

**Total:** ~13 recursos compartidos que NO deben eliminarse.

### D.3 Ajustes Mínimos Requeridos

#### ⚠️ **PREVENIR CREACIÓN DE TEAMS DESDE HOST:**

| Archivo | Función | Problema Actual | Solución |
|---------|---------|-----------------|----------|
| `app/host/teams/actions.ts` | `createTeam` | Crea `Team` con `tenantId` Host | **ELIMINAR** función (o agregar guard `assertServiceTenantById` y fallar) |
| `app/host/teams/actions.ts` | `updateTeam` | Actualiza `Team` del tenant Host | **ELIMINAR** función (o agregar guard) |
| `app/host/teams/actions.ts` | `deleteTeam` | Elimina `Team` del tenant Host | **ELIMINAR** función (o agregar guard) |

**Recomendación:** Eliminar estas funciones completamente. Host NO debe crear/editar Teams.

#### ⚠️ **MIGRAR `PropertyTeam` A `HostWorkGroupProperty`:**

| Archivo | Función | Cambio Requerido |
|---------|---------|------------------|
| `app/host/properties/actions.ts` | `assignTeamToProperty` | Cambiar a `assignWorkGroupToProperty` usando `HostWorkGroupProperty` |
| `app/host/properties/actions.ts` | `removeTeamFromProperty` | Cambiar a `removeWorkGroupFromProperty` usando `HostWorkGroupProperty` |
| `app/host/cleanings/actions.ts` | `createCleaning` | Cambiar `PropertyTeam.findFirst()` → `getServiceTeamsForPropertyViaWorkGroups()` |
| `app/host/cleanings/[id]/page.tsx` | - | Cambiar `PropertyTeam.findMany()` → `HostWorkGroupProperty.findMany()` + resolver `WorkGroupExecutor` |

**Recomendación:** Mantener `PropertyTeam` durante transición. Actualizar queries de Host gradualmente. Cleaner seguirá usando `PropertyTeam` hasta que todos los WorkGroups tengan `WorkGroupExecutor`.

#### ⚠️ **LIMPIAR DATOS EXISTENTES (SI APLICA):**

**Problema:** Host puede haber creado Teams con `tenantId` Host (violación de dominio).

**Solución:**
1. **Script de auditoría:** Identificar Teams con `tenantId` Host
2. **Script de migración:** Crear `HostWorkGroup` + `WorkGroupExecutor` para cada Team Host existente
3. **Script de limpieza:** Eliminar Teams con `tenantId` Host (después de migración)

**⚠️ PRECAUCIÓN:** Verificar que estos Teams NO tengan `TeamMembership` activos antes de eliminar.

---

## E) RECOMENDACIÓN FINAL

### ✅ **CONFIRMACIÓN: Podemos eliminar `app/host/teams` completamente**

**Razones:**
1. ✅ **NO hay imports cruzados** entre Cleaner y Host Teams
2. ✅ **Cleaner usa sus propios queries** con tenant Services
3. ✅ **API routes están protegidas** (`assertServiceTenantById`)
4. ✅ **Modelos compartidos NO se eliminan** (solo se dejan de usar desde Host)

### ⚠️ **MITIGACIONES REQUERIDAS:**

#### 1. **Mantener `PropertyTeam` durante transición** (RIESGO MEDIO)
- **Acción:** Host migra a `HostWorkGroupProperty`, pero Cleaner sigue usando `PropertyTeam`
- **Duración:** Hasta que todos los WorkGroups tengan `WorkGroupExecutor` vinculados
- **Validación:** Script que verifica que cada `HostWorkGroupProperty` tiene al menos un `WorkGroupExecutor` activo

#### 2. **Actualizar queries de asignación de limpiezas** (RIESGO MEDIO)
- **Archivo:** `app/host/cleanings/actions.ts` función `createCleaning`
- **Cambio:** `PropertyTeam.findFirst()` → `getServiceTeamsForPropertyViaWorkGroups()`
- **Validación:** Tests que verifican que se asigna `assignedMembershipId` correctamente

#### 3. **Eliminar creación de Teams desde Host** (RIESGO BAJO)
- **Archivo:** `app/host/teams/actions.ts` funciones `createTeam`, `updateTeam`, `deleteTeam`
- **Acción:** Eliminar funciones o agregar guard que falle si `tenantId` no es Services
- **Validación:** Script que identifica Teams con `tenantId` Host y los migra a WorkGroups

#### 4. **Redirect temporal de `/host/teams` → `/host/workgroups`** (RIESGO BAJO)
- **Acción:** Crear `app/host/teams/page.tsx` que redirige a `/host/workgroups`
- **Duración:** Durante migración (1-2 semanas)
- **Validación:** Verificar que usuarios no pierdan acceso

### 📋 **PLAN DE MIGRACIÓN SUGERIDO:**

#### **Fase 1: Preparación (Sin cambios en producción)**
1. Crear `app/host/workgroups/**` (páginas + acciones)
2. Crear helpers para migrar `PropertyTeam` → `HostWorkGroupProperty`
3. Scripts de auditoría para identificar Teams Host

#### **Fase 2: Migración Paralela (Coexistencia)**
1. Desplegar `app/host/workgroups/**` junto a `app/host/teams/**`
2. Redirect `/host/teams` → `/host/workgroups`
3. Migrar datos: Crear `HostWorkGroup` + `WorkGroupExecutor` para Teams existentes

#### **Fase 3: Actualización de Queries Host**
1. Actualizar `app/host/cleanings/actions.ts` para usar WorkGroups
2. Actualizar `app/host/properties/actions.ts` para usar WorkGroups
3. Validar que Cleaner sigue funcionando (usando `PropertyTeam`)

#### **Fase 4: Eliminación (Solo después de validación)**
1. Eliminar `app/host/teams/**` completamente
2. Eliminar redirect `/host/teams` → `/host/workgroups`
3. Limpiar código legacy (si aplica)

#### **Fase 5: Migración Cleaner (Futuro)**
1. Actualizar queries de Cleaner para usar `WorkGroupExecutor` + `HostWorkGroupProperty`
2. Deprecar `PropertyTeam` (después de migración completa)

### 🎯 **RESUMEN DE RIESGOS:**

| Riesgo | Nivel | Mitigación | Estado |
|--------|-------|------------|--------|
| Eliminar `app/host/teams/**` | 🟢 BAJO | No hay imports cruzados | ✅ Seguro |
| Eliminar creación de Teams desde Host | 🟢 BAJO | Ya es violación de dominio | ✅ Seguro |
| Migrar `PropertyTeam` a `HostWorkGroupProperty` | 🟡 MEDIO | Mantener ambos durante transición | ⚠️ Requiere plan |
| Actualizar queries de asignación | 🟡 MEDIO | Usar `getServiceTeamsForPropertyViaWorkGroups()` | ⚠️ Requiere tests |
| Limpiar Teams Host existentes | 🟡 MEDIO | Script de migración + validación | ⚠️ Requiere script |

**RIESGO GENERAL:** 🟢 **BAJO** (con mitigaciones adecuadas)

---

## FIN DEL ANÁLISIS

**Conclusión:** Podemos proceder con la eliminación de `app/host/teams/**` y migración a `app/host/workgroups/**` **SIN ROMPER Cleaner/Services**, siempre que sigamos el plan de migración gradual y mantengamos `PropertyTeam` durante la transición.

