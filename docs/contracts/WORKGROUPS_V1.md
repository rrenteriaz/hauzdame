# Work Groups (WG) — Contrato v1

**Estado:** Canonical  
**Última actualización:** v1.3 — Ajustes UX C.2 (botón inline en tarjeta, link historial sin hint)  
**Alcance:** Host + conexión Services

---

## 1. Header

Este documento es la **única fuente de verdad** para:
- Work Groups (HostWorkGroup) en el dominio Host
- Asignación de propiedades a Work Groups (HostWorkGroupProperty)
- Invitaciones para conectar Cleaners/Teams ejecutores (HostWorkGroupInvite)
- Conexión entre Work Groups y Teams de Services (WorkGroupExecutor)
- UX y flujos de las páginas:
  - `/host/workgroups`
  - `/host/workgroups/[id]`
  - `/host/workgroups/[id]/teams/[teamId]` (detalle Team en contexto WG)
  - `/host/workgroups/[id]/teams/[teamId]/history` (historial dedicado + filtros)

**⚠️ INVARIANTE CRÍTICO:** El orden y títulos de las tarjetas en `/host/workgroups/[id]` están definidos como contrato canónico y NO deben cambiar sin actualizar este documento.

---

## 2. Definiciones / Glosario

### 2.1 Entidades principales

- **Work Group (HostWorkGroup)**: Grupo de trabajo perteneciente a un tenant Host. Agrupa propiedades y se conecta con Teams ejecutores de Services. Campos relevantes:
  - `id`: Identificador único
  - `tenantId`: Tenant del Host
  - `name`: Nombre del Work Group (único por tenant para WGs ACTIVE)
  - `status`: `ACTIVE` | `INACTIVE` (ver sección 7.7)
  - `createdAt`: Fecha de creación

- **Propiedades asignadas (HostWorkGroupProperty)**: Relación many-to-many entre `HostWorkGroup` y `Property`. Indica qué propiedades están asignadas a un Work Group. El `tenantId` en esta tabla DEBE ser el `hostTenantId` (no `servicesTenantId`).

- **Invitación WG (HostWorkGroupInvite)**: Invitación creada por el Host para que un Team Leader (Cleaner) en Services se conecte a un Work Group. Campos relevantes:
  - `token`: Token único para la invitación
  - `workGroupId`: ID del Work Group al que se invita
  - `status`: `PENDING` | `CLAIMED` | `REVOKED` | `EXPIRED` (efectivo)
  - `prefillName`: Nombre opcional del invitado
  - `expiresAt`: Fecha de expiración
  - `createdByUserId`: Usuario Host que creó la invitación
  - `claimedByUserId`: Usuario Cleaner que aceptó la invitación (null si no ha sido aceptada)
  - `claimedAt`: Fecha de aceptación (null si no ha sido aceptada)

- **Executor (WorkGroupExecutor)**: Conexión entre un `HostWorkGroup` (Host tenant) y un `Team` (Services tenant). Campos críticos:
  - `hostTenantId`: Tenant del Host (para scoping correcto)
  - `servicesTenantId`: Tenant del Services (donde vive el Team)
  - `workGroupId`: ID del Work Group
  - `teamId`: ID del Team ejecutor
  - `status`: `ACTIVE` | `INACTIVE`

- **Team (Services) / TeamMembership**: Equipo en el dominio Services. Un Team puede tener múltiples miembros (`TeamMembership`) y un Team Leader (`role: "TEAM_LEADER"`).

### 2.2 Conceptos de tenant

- **Host tenant**: Tenant donde vive el `HostWorkGroup` y las `Property`. El `hostTenantId` es crítico para:
  - Filtrar `HostWorkGroupProperty` correctamente
  - Scoping de queries cross-tenant
  - Evitar leaks de datos entre tenants

- **Services tenant**: Tenant donde vive el `Team` y `TeamMembership` del Cleaner. Cada Cleaner tiene su propio Services tenant (creado automáticamente si no existe).

**⚠️ REGLA CRÍTICA:** `HostWorkGroupProperty.tenantId` SIEMPRE debe ser `hostTenantId`, nunca `servicesTenantId`. Esto es un invariante del sistema.

---

## 3. Roles & Permisos

### 3.1 Roles Host que pueden editar

Los siguientes roles pueden crear, editar y gestionar Work Groups:
- `OWNER`
- `MANAGER`
- `AUXILIAR`

**Verificación en código:** `canEditProperties = !!currentUser && ["OWNER", "MANAGER", "AUXILIAR"].includes(currentUser.role)`

### 3.2 Acciones condicionadas a permisos

- **Crear Work Group**: Requiere permisos de edición
- **Editar nombre del Work Group**: Requiere permisos de edición
- **Eliminar Work Group**: Requiere permisos de edición + validación (solo si no tiene propiedades ni ejecutores)
- **Asignar/desasignar propiedades**: Requiere permisos de edición
- **Crear invitación**: Requiere permisos de edición
- **Conectar equipo ejecutor**: Requiere permisos de edición
- **Ver detalle Team en contexto WG**: Disponible para todos; acciones de toggle solo con permisos

### 3.3 Vista read-only

Usuarios sin permisos de edición pueden:
- Ver lista de Work Groups
- Ver detalle de Work Groups
- Ver propiedades asignadas
- Ver ejecutores conectados
- Ver invitaciones (pero no crear nuevas)
- Ver detalle del Team en contexto WG (sin poder desactivar/activar)

---

## 4. Contrato por página

### 4.1 Host `/host/workgroups` (Listado)

**Propósito:** "Gestiona los grupos de trabajo y sus asignaciones a propiedades"

**Datos mostrados:**
- Lista "Tus grupos de trabajo"
- Cada item muestra:
  - Nombre del Work Group
  - Resumen: `"{X} propiedad/propiedades · {Y} ejecutor/ejecutores"`
  - Acción "Editar" (según permisos)

**Estados:**
- **Vacío:** Muestra mensaje: "Todavía no has creado ningún grupo de trabajo. Usa el botón 'Crear grupo de trabajo' para agregar el primero."
- **Con datos:** Lista ordenada por `createdAt DESC`

**Acciones:**
- **CTA principal:** "Crear grupo de trabajo" (botón al final de la lista)
- **Acción por item:** "Editar" (link que abre modal de edición/eliminación)

**Reglas de conteo:**
- **Propiedades:** Cuenta `HostWorkGroupProperty` por `workGroupId` (sin filtrar por `tenantId` en el query, pero debe ser consistente)
- **Ejecutores:** Cuenta `WorkGroupExecutor` con `status: "ACTIVE"` por `workGroupId`

**Navegación:**
- Click en item → `/host/workgroups/[id]`
- `returnTo` se preserva para navegación de regreso

---

### 4.2 Host `/host/workgroups/[id]` (Detalle)

**Page title:** "Detalle del grupo de trabajo"  
**Subtitle:** Nombre del Work Group

**⚠️ ORDEN CANÓNICO DE TARJETAS (NO CAMBIAR):**

#### Tarjeta 1: "Grupo de trabajo"
- **Propósito:** Información básica del Work Group y acciones principales
- **Campos mostrados:**
  - Label: "Grupo de trabajo"
  - Nombre del Work Group (texto grande)
- **Acciones disponibles:**
  - "Editar" (si `canEditProperties`)
  - "Eliminar" (si `canEditProperties` y no tiene propiedades ni ejecutores)

#### Tarjeta 2: "Propiedades asignadas (N)" — **COLAPSABLE**
- **Propósito:** Lista de propiedades asignadas al Work Group
- **Estado por defecto:** **CONTRAÍDA** (`isCollapsed = true`)
- **Header colapsable:**
  - Título: "Propiedades asignadas"
  - Contador: `(N)` donde `N = assignedProperties.length`
  - Flecha de expansión/contracción (caret)
  - Botón "Editar propiedades" siempre visible (fuera del área colapsable, si `canEditProperties`)
- **Contenido colapsable:**
  - **Estado vacío:** "No hay propiedades asignadas a este grupo de trabajo. Asigna propiedades desde aquí o desde el detalle de cada propiedad."
  - **Con datos:** Lista ordenada alfabéticamente por `shortName` o `name`:
    - Cada item muestra:
      - `shortName` o `name` (texto grande)
      - `name` completo si difiere de `shortName` (texto pequeño)
      - `address` con icono 📍 si existe
      - Badge "Inactiva" si `isActive === false`
      - Flecha de navegación (→)
    - Click en item → `/host/properties/[propertyId]?returnTo=/host/workgroups/[id]`
- **Acciones:**
  - Expandir/contraer (click en header)
  - "Editar propiedades" (abre modal de selección)

**⚠️ INVARIANTE:** Esta tarjeta DEBE ser colapsable y estar contraída por defecto. El formato visual debe seguir el patrón oficial de tarjetas colapsables del proyecto.

#### Tarjeta 3: "Cleaners en tu grupo (N)"
- **Propósito:** Lista de equipos ejecutores (Teams de Services) conectados al Work Group
- **Título visible:** "Cleaners en tu grupo" (antes "Equipos ejecutores")
- **Campos mostrados:**
  - Display name del team: `"{LeaderName}'s Team"` (usando `getTeamDisplayNameForHost`)
  - Contador: "Miembros: X" (donde X = `executorMembersCountByTeamId[teamId]`)
  - Badge de estado: "Activo" (verde) o "Inactivo" (gris) según `executor.status`
- **Estados:**
  - **Vacío:** "No hay equipos ejecutores conectados a este grupo de trabajo. Los equipos ejecutores se conectan desde el dominio Services." (si no `canEdit`) o muestra botón "Conectar equipo ejecutor" (si `canEdit`)
  - **Con datos:** Lista de ejecutores con información de líder y miembros
- **Acciones:**
  - **Tap/Click en Team row:** Navega a `/host/workgroups/[id]/teams/[teamId]?returnTo=...`
  - "Conectar equipo ejecutor" (si `canEdit`) → abre modal `AddExecutorModal`
- **⚠️ NOTA:** No mostrar `tenantId` en la UI

#### Tarjeta 4: "Invita a un Cleaner a tu grupo de trabajo"
- **Propósito:** Gestión de invitaciones para conectar Team Leaders (Cleaners) al Work Group
- **Título visible:** "Invita a un Cleaner a tu grupo de trabajo" (antes "Invitaciones")
- **Campos mostrados:**
  - Botón "Crear invitación" (siempre visible si `canEditProperties`)
  - Contador de pendientes: Badge con número de invitaciones `PENDING`
  - Control colapsable "Ver invitaciones" (contraído por defecto)
- **Contenido colapsable (al expandir "Ver invitaciones"):**
  - Lista de invitaciones **VISIBLES** (filtradas: `status !== "REVOKED"`) con:
    - Badge de estado: "Pendiente" (amarillo), "Aceptada" (verde), "Expirada" (gris)
    - Nombre del invitado: `prefillName` o "(sin nombre)"
    - Fechas: "Creada: {fecha} · Expira: {fecha}"
    - Hint de expiración: "Expira en X días" o "Expirada"
    - Link de invitación (input readonly) con botón "Copiar" (solo para `PENDING`)
    - Botón "Revocar enlace" (solo para `PENDING` o `EXPIRED`)
  - **⚠️ REGLA:** Invitaciones con `status: "REVOKED"` NO se muestran en la UI (soft-delete/hide por integridad)
- **Estados:**
  - **Sin invitaciones:** "Aún no has generado invitaciones para este grupo de trabajo."
  - **Con invitaciones:** Muestra lista colapsable
- **Acciones:**
  - "Crear invitación" → abre modal para generar link
  - "Ver invitaciones" → expande/contrae lista
  - "Copiar" link → copia al portapapeles
  - "Revocar enlace" → marca invitación como `REVOKED`

#### Tarjeta 5: "Info del grupo"
- **Propósito:** Información adicional del Work Group
- **Campos mostrados:**
  - Label: "Fecha de creación"
  - Valor: Fecha formateada en español (ej: "19 dic 2024")

**⚠️ INVARIANTE CRÍTICO:** El orden de estas 5 tarjetas NO debe cambiar. Cualquier cambio en el orden o títulos debe actualizar este contrato primero.

---

### 4.3 Host `/host/workgroups/[id]/teams/[teamId]` (Detalle del Team en contexto WG) — **C.2 (DONE)**

**Propósito:** Ver el estado del equipo ejecutor dentro del WG, revisar limpiezas futuras y acceder al historial dedicado.

**Page title:** "Detalle del equipo"  
**Subtitle:** Display name del Team (usando `getTeamDisplayNameForHost`)

**Secciones (orden recomendado):**
1) **Resumen del Team executor**
   - Tarjeta con label: "Equipo ejecutor"
   - Nombre display del Team
   - Badge estado: Activo/Inactivo (según `WorkGroupExecutor.status`)
   - Botón de acción inline (misma fila que el nombre):
     - "Desactivar" si status ACTIVE
     - "Reactivar" si status INACTIVE
     - Tamaño pequeño (`text-xs`) alineado a la derecha de la tarjeta
   - Confirmación obligatoria (modal)
   - Feedback no bloqueante (toast; NO usar `alert()`)

2) **Tarjeta: Limpiezas futuras (N)**
   - Lista de limpiezas futuras asociadas al Team dentro del WG (ver 6.3)
   - Cada row navega a `/host/cleanings/[cleaningId]?returnTo=...`
   - Estado vacío: "No hay limpiezas futuras asignadas a este equipo."

3) **Link a historial dedicado (no tarjeta de historial inline)**
   - Un row/CTA navegable:
     - Texto: "Historial de limpiezas"
     - Icono de flecha (→) a la derecha
   - Navega a: `/host/workgroups/[id]/teams/[teamId]/history?returnTo=...`

**Scoping y validaciones:**
- Verificar que `HostWorkGroup` existe y pertenece al tenant
- Verificar que `WorkGroupExecutor` existe para `(hostTenantId, workGroupId, teamId)`
- Verificar que `Team` existe (Services)

**Performance:**
- Evitar queries duplicadas de memberships: una sola query ACTIVE debe servir para:
  - Resolver líder efectivo
  - Obtener `membershipIds` (si aplica por compatibilidad legacy)

---

### 4.4 Host `/host/workgroups/[id]/teams/[teamId]/history` (Historial dedicado + filtros)

**Propósito:** Histórico de limpiezas del Team en contexto del WG, con filtros y UX escalable.

**Requisitos UX:**
- Debe usar el **mismo patrón de filtros** ya usado en la página de **Reservas** (Host), incluyendo:
  - Componentes/estructura de filtros existentes (reusar; no inventar nuevo sistema)
- Debe usar el **formato oficial de contraer/expandir por mes**:
  - Primer mes EXPANDIDO por default
  - Meses restantes CONTRAÍDOS por default

**Agrupación:**
- Agrupar limpiezas por mes (YYYY-MM)
- Dentro de cada mes, lista ordenada por fecha DESC (histórico típico)

**Acciones:**
- Row navega a `/host/cleanings/[cleaningId]?returnTo=...` (siempre preservando returnTo seguro)

**Menú en móvil (UX global)**
- En versión móvil, el menú/top nav debe mostrar **iconos en lugar de texto**, siguiendo el mismo patrón responsive usado en **Reservas** (solo móvil; desktop conserva texto).
- **Nota:** Esto aplica a top-nav y no a bottom-nav (si existe).

---

## 5. Flujos / Backend contract

### 5.1 Crear Work Group

**Endpoint/Acción:** `app/host/workgroups/actions.ts -> createWorkGroup`

**Input:**
- `name` (string, requerido)
- `notes` (string, opcional)

**Proceso:**
1. Validar `tenant` (Host tenant)
2. Validar `name` no vacío
3. **Validar unicidad de nombre:** Verificar que NO existe otro `HostWorkGroup` con `name` igual, `tenantId` igual y `status: "ACTIVE"` (ver sección 7.8)
4. Crear `HostWorkGroup` con:
   - `tenantId`: Host tenant ID
   - `name`: Nombre proporcionado
   - `status`: `"ACTIVE"` (por defecto)
5. `revalidatePath("/host/workgroups")`

**Errores:**
- Validación app: "Ya existe un grupo de trabajo ACTIVE con ese nombre en este tenant." (si hay otro WG ACTIVE con el mismo nombre)
- `P2002` (unique constraint): Solo aplica si hay índice único en DB (ver sección 7.8)

**UI:** Modal desde `CreateWorkGroupForm` con campos nombre y notas.

---

### 5.2 Editar nombre del Work Group

**Endpoint/Acción:** `app/host/workgroups/actions.ts -> updateWorkGroup`

**Input:**
- `workGroupId` (string)
- `name` (string, requerido)

**Proceso:**
1. Validar `tenant` (Host tenant)
2. Validar `workGroupId` y `name`
3. **Validar unicidad de nombre:** Si el WG actual está ACTIVE, verificar que NO existe otro `HostWorkGroup` con `name` igual, `tenantId` igual, `status: "ACTIVE"` y `id` diferente
4. `updateMany` en `HostWorkGroup` con filtro `id` y `tenantId`
5. `revalidatePath("/host/workgroups")` y `revalidatePath("/host/workgroups/[id]")`

---

### 5.3 Eliminar Work Group

**Endpoint/Acción:** `app/host/workgroups/actions.ts -> deleteWorkGroup`

**Input:**
- `workGroupId` (string)

**Validaciones:**
- Solo se puede eliminar si:
  - `hasProperties === false` (no tiene `HostWorkGroupProperty`)
  - `hasExecutors === false` (no tiene `WorkGroupExecutor` ACTIVE)

**Proceso:**
1. Validar `tenant` (Host tenant)
2. Validar que no tiene propiedades ni ejecutores
3. `delete` en `HostWorkGroup`
4. `revalidatePath("/host/workgroups")`
5. Redirect a `/host/workgroups`

---

### 5.4 Asignar / desasignar propiedades al Work Group

**Endpoint/Acción:** `app/host/workgroups/actions.ts -> updateWorkGroupProperties`

**Input:**
- `workGroupId` (string)
- `propertyIds` (JSON array de strings)

**Proceso:**
1. Validar `tenant` (Host tenant)
2. Validar que `WorkGroup` existe y pertenece al tenant
3. Validar que todas las `propertyIds` existen y pertenecen al `hostTenantId` y están `isActive: true`
4. **Hard-clean de `HostWorkGroupProperty`:**
   - `deleteMany` donde `workGroupId = workGroupId` (SIN filtrar por `tenantId` para limpiar filas stale)
5. **Insertar nuevas filas:**
   - `createMany` con `tenantId = hostTenantId`, `workGroupId`, `propertyId` (deduplicado)
   - `skipDuplicates: true` para resiliencia
6. `revalidatePath("/host/workgroups")` y `revalidatePath("/host/workgroups/[id]")`

**⚠️ INVARIANTE CRÍTICO:** `HostWorkGroupProperty.tenantId` SIEMPRE debe ser `hostTenantId`, nunca `servicesTenantId`.

---

### 5.5 Conectar un Team executor desde Host

**Endpoint/Acción:** `app/host/workgroups/actions-executors.ts -> addExecutorToWorkGroup`

**Input:**
- `workGroupId` (string)
- `teamId` (string)

**Proceso:**
1. Validar `tenant` (Host tenant)
2. Validar que `WorkGroup` existe y pertenece al tenant
3. Buscar un `WorkGroupExecutor` existente con `hostTenantId = tenant.id` y `teamId = teamId` (debe existir previamente conectado a otro WG del mismo Host)
4. Obtener `servicesTenantId` del executor existente
5. `upsert` en `WorkGroupExecutor`:
   - `where`: `hostTenantId_workGroupId_teamId`
   - `create`: `hostTenantId`, `workGroupId`, `teamId`, `servicesTenantId`, `status: "ACTIVE"`
   - `update`: `status: "ACTIVE"`
6. `revalidatePath("/host/workgroups/[id]")`

---

### 5.5.1 Cambiar status de un executor (ACTIVE ↔ INACTIVE) — **C.2**

**Acción server:** `app/host/workgroups/actions-executors.ts -> toggleExecutorStatusAction`  
**Lógica canónica (no duplicar):** `lib/workgroups/toggleExecutorStatus.ts`

**Input:**
- `workGroupId` (string)
- `teamId` (string)
- `newStatus` ("ACTIVE" | "INACTIVE")

**Proceso:**
1. Validar `tenant` (Host tenant)
2. Validar que `WorkGroup` existe y pertenece al tenant
3. Invocar `toggleExecutorStatus({ hostTenantId, workGroupId, teamId, newStatus })`
4. Revalidar rutas:
   - `/host/workgroups`
   - `/host/workgroups/[id]`
   - `/host/workgroups/[id]/teams/[teamId]`
   - (y si aplica) `/host/workgroups/[id]/teams/[teamId]/history`

**Feedback UI:**
- Debe ser toast no bloqueante (NO `alert()`)

---

### 5.6 Crear invitación (HostWorkGroupInvite)

**Endpoint:** `POST /api/host-workgroups/[workGroupId]/invites`  
**Archivo:** `app/api/host-workgroups/[workGroupId]/invites/route.ts`

**(sin cambios respecto v1.1)**

---

### 5.7 Aceptar invitación (Claim)

**Endpoint:** `POST /api/host-workgroup-invites/[token]/claim`  
**Archivo:** `app/api/host-workgroup-invites/[token]/claim/route.ts`

**(sin cambios respecto v1.1)**

---

### 5.8 Revocar invitación

**Endpoint/Acción:** `app/host/workgroups/invites/actions.ts -> revokeInvite`

**(sin cambios respecto v1.1)**

---

## 6. Integración con Services

### 6.1 Visibilidad de propiedades para Cleaners

**(sin cambios respecto v1.1)**

### 6.2 Desasignación de propiedades vs histórico de limpiezas (Cleaner)

**Regla crítica de producto (Cleaner):**
1. **Propiedades desasignadas NO visibles** en listados del Cleaner.
2. **Histórico de limpiezas preservado** para el Cleaner.
3. **Requisito técnico (Cleaner):** El histórico del Cleaner debe poder renderizarse sin depender del acceso actual a `Property`.

**Implementación preferida y requerida (Cleaner):**
- Snapshot de información de propiedad en `Cleaning`:
  - `propertyName`, `propertyShortName`, `propertyAddress` (opcionales)
- UI de histórico del Cleaner muestra snapshot y NO hace join a `Property`.
- Links a detalle de propiedad se ocultan o deshabilitan si la propiedad ya no está asignada.

> Nota: Esto aplica al dominio/UX de Cleaner. En Host, el histórico puede hacer join a `Property` según permisos y contexto.

### 6.3 Desactivar Team executor y efecto en limpiezas futuras (Host)

**Ruta:** `/host/workgroups/[id]/teams/[teamId]`  
**Navegación:** Desde tarjeta "Cleaners en tu grupo" (Team row clickable)

**Funcionalidades:**
1. **Ver limpiezas futuras asignadas** (en la página de detalle)
2. **Ver historial** vía página dedicada `/history`
3. **Desactivar/activar Team:**
   - Cambia `WorkGroupExecutor.status` entre `ACTIVE` e `INACTIVE`
   - **Efecto inmediato cuando pasa a INACTIVE:**
     - Limpiezas FUTURAS asociadas al Team quedan "Sin asignar"
     - `attentionReason = "NO_TEAM_EXECUTING"`
     - `needsAttention = true`
     - Limpieza de asignación: `assignedMembershipId`, `teamId`, etc. (según implementación canónica)
     - El Team deja de ver propiedades vía WGE (no aporta visibilidad)
   - Cuando vuelve a ACTIVE:
     - Recupera visibilidad vía WGE
     - Limpiezas sin asignar no se reasignan automáticamente

**⚠️ INVARIANTE:** Desactivar un Team executor NO destruye el `WorkGroupExecutor`, solo cambia su `status`. El histórico de limpiezas pasadas se preserva intacto.

---

## 7. Invariantes (MUST NOT BREAK)

### 7.1 Orden y títulos de tarjetas

- **NO cambiar** el orden de las 5 tarjetas en `/host/workgroups/[id]`
- **NO cambiar** los títulos visibles sin actualizar este contrato:
  - "Grupo de trabajo"
  - "Propiedades asignadas (N)"
  - "Cleaners en tu grupo (N)"
  - "Invita a un Cleaner a tu grupo de trabajo"
  - "Info del grupo"

### 7.2 Propiedades asignadas colapsable

- **DEBE** ser colapsable
- **DEBE** estar contraída por defecto (`isCollapsed = true`)
- **DEBE** mostrar contador en el header: `(N)`
- **DEBE** mantener botón "Editar propiedades" siempre visible (fuera del área colapsable)

### 7.3 Scoping de tenant

- `HostWorkGroupProperty.tenantId` **SIEMPRE** debe ser `hostTenantId`, nunca `servicesTenantId`
- `WorkGroupExecutor.hostTenantId` **SIEMPRE** debe coincidir con `HostWorkGroup.tenantId`
- Queries de `Property` vía WGE **DEBEN** filtrar por `tenantId IN hostTenantIds` (derivado de `WorkGroupExecutor`)

### 7.4 Serialización de props

- **NO** pasar `Map` objects como props de Server Components a Client Components
- Convertir a `Record` objects antes de pasar props serializables

### 7.5 Estados de invitación

- Estado efectivo se calcula: Si `status === "PENDING"` y `expiresAt < now` → `effectiveStatus = "EXPIRED"`
- UI debe mostrar estado efectivo, no solo el `status` de DB
- **Invitaciones REVOKED:** NO se muestran en la UI (soft-delete/hide).

### 7.6 Multi-WG por Team (mismo hostTenantId)

- Un Team de Services PUEDE estar conectado a múltiples Work Groups del mismo Host (`hostTenantId`).
- Cada conexión es independiente (`WorkGroupExecutor` separado por `workGroupId`).
- El Team ve la unión de todas las propiedades asignadas a los WGs a los que está conectado (vía WGE ACTIVE).

### 7.7 Work Group ACTIVE/INACTIVE

- `HostWorkGroup.status`: `ACTIVE` | `INACTIVE`
- Un WG INACTIVE **NO aporta visibilidad de propiedades** al Cleaner vía WGE
- Queries de visibilidad deben filtrar por: `WorkGroupExecutor.status = "ACTIVE"` **AND** `HostWorkGroup.status = "ACTIVE"`

### 7.8 Unicidad de nombre solo para WGs activos

- No puede existir otro WG ACTIVE con el mismo nombre dentro del mismo Host tenant.
- Si el WG previo está INACTIVE, se permite reusar el nombre.

### 7.9 UX: Botones y feedback

- Botón de activar/desactivar executor:
  - Debe estar dentro de la tarjeta "Equipo ejecutor", en la misma fila que el nombre del equipo
  - Tamaño pequeño (`text-xs`) alineado a la derecha
  - Texto abreviado: "Desactivar" / "Reactivar" (no "Desactivar equipo" / "Reactivar equipo")
- Feedback de acciones:
  - Debe ser no bloqueante (toast). **No usar `alert()`**.

---

## 8. Checklist de validación (QA manual)

### 8.1 Host - Listado (`/host/workgroups`)
**(sin cambios respecto v1.1)**

### 8.2 Host - Detalle (`/host/workgroups/[id]`)
**(sin cambios respecto v1.1, más navegación a Team)**
- [ ] Tap/click en Team row navega a `/host/workgroups/[id]/teams/[teamId]`

### 8.3 Host - Crear/Editar/Eliminar Work Group
**(sin cambios respecto v1.1)**

### 8.4 Host - Asignar propiedades
**(sin cambios respecto v1.1)**

### 8.5 Host - Invitaciones
**(sin cambios respecto v1.1)**

### 8.6 Services - Aceptar invitación
**(sin cambios respecto v1.1)**

### 8.7 Services - Ver propiedades vía WGE
**(sin cambios respecto v1.1)**

### 8.8 Host - Inactivar Work Group
**(sin cambios respecto v1.1)**

### 8.9 Host - Detalle Team en contexto WG (`/host/workgroups/[id]/teams/[teamId]`) — C.2
- [ ] La página existe y carga con scoping correcto (tenant + WG + executor)
- [ ] Muestra estado Activo/Inactivo del executor
- [ ] Botón Desactivar/Reactivar existe y NO está envuelto en una tarjeta independiente
- [ ] Confirm modal aparece antes de ejecutar
- [ ] Feedback se muestra vía toast (no alert)
- [ ] Limpiezas FUTURAS se muestran correctamente
- [ ] Link "Ver historial de limpiezas" navega a `/history`

### 8.10 Host - Historial dedicado (`/host/workgroups/[id]/teams/[teamId]/history`)
- [ ] Página existe y respeta returnTo
- [ ] Filtros son los mismos patrón/componentes que Reservas (Host)
- [ ] Agrupa por mes con expand/collapse oficial
- [ ] Primer mes expandido por default; los demás contraídos
- [ ] Navegación a cleaning detail preserva returnTo

### 8.11 Host - Desasignar propiedades (Cleaner histórico)
**(sin cambios respecto v1.1)**

### 8.12 Host - Invitaciones REVOKED
**(sin cambios respecto v1.1)**

---

## 9. Referencias cruzadas

- Invitaciones generales: `docs/contracts/INVITES_V3.md`
- Teams y Memberships: `docs/contracts/CONTRATO DE TENANTS Y TEAMS (SERVICE-CLEANER).md`
- Resolución de contexto Cleaner: `lib/cleaner/resolveCleanerContext.ts`
- Helper WGE: `lib/workgroups/getPropertiesForCleanerTeamViaWGE.ts`
- Display name Team: `lib/host/teamDisplayName.ts`
- Lógica canónica toggle executor: `lib/workgroups/toggleExecutorStatus.ts`

---

## 10. Known Issues / Observaciones

### 10.1 Hard-clean de HostWorkGroupProperty
**(sin cambios respecto v1.1)**

### 10.2 Líder efectivo sin TEAM_LEADER explícito
**(sin cambios respecto v1.1)**

### 10.3 Conteo de ejecutores en listado
**(sin cambios respecto v1.1)**

### 10.4 Unicidad de nombre solo para WGs activos
**(sin cambios respecto v1.1)**

### 10.5 Snapshot de información de propiedad en Cleaning (Cleaner)
**(sin cambios respecto v1.1; aplica a Cleaner)**

---

**Fin del contrato**
