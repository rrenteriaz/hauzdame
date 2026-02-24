# Dashboard Cleaner "Hoy" — Contrato v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Contrato inicial  
**Alcance:** Cleaner/TL (Services tenant)

---

## 1. Header

Este documento es la **única fuente de verdad** para:
- Dashboard Cleaner "Hoy" (`/cleaner`)
- Cards de resumen (Mis limpiezas / Disponibles / Próximas limpiezas)
- Secciones de listas en el dashboard
- Navegación desde cards hacia vistas detalladas
- Query layer canónico (`lib/cleaner/cleanings/query.ts`)
- Consistencia entre contadores y listas

**⚠️ INVARIANTE CRÍTICO:** Los contadores de las cards y las listas del dashboard DEBEN usar exactamente el mismo filtro base del query layer canónico. Cualquier discrepancia entre count y lista es una violación del contrato.

---

## 2. Objetivo del Dashboard "Hoy"

### 2.1 Qué debe resolver

El Dashboard "Hoy" (`/cleaner`) proporciona una **visión rápida del día/semana** para el Team Leader (TL) o Cleaner individual. Permite:

- Ver de un vistazo cuántas limpiezas tiene asignadas, disponibles y próximas
- Acceder rápidamente a las limpiezas más relevantes (hoy/próximos días)
- Navegar a vistas detalladas con un solo click
- Visualizar el calendario mensual/diario con eventos de limpiezas

### 2.2 Qué NO es

- **NO sustituye** "Todas las limpiezas" (`/cleaner/cleanings/all`) para listados completos
- **NO es** una herramienta de gestión avanzada (eso corresponde a `/host`)
- **NO muestra** alertas de configuración del Host (ej: "Atención requerida", "No hay equipos disponibles")

### 2.3 Usuarios objetivo

- **Team Leader (TL)**: Cleaner con rol de liderazgo en un Team
- **Cleaner individual**: Miembro de un Team sin rol especial
- Ambos pueden tener múltiples TeamMemberships activos

---

## 3. Fuentes de verdad (Source of truth)

### 3.1 Query layer canónico

**TODAS** las queries de limpiezas para el Cleaner/TL deben derivar del query layer canónico ubicado en:

```
lib/cleaner/cleanings/query.ts
```

Este módulo expone:

- `getCleanerScope(context?)`: Retorna scope unificado (propertyIds, tenantIds, teamIds, membershipIds, mode)
- `getCleanerCleaningsCounts(context?)`: Retorna contadores para cards
- `getCleanerCleaningsList(params, context?)`: Retorna lista de limpiezas con filtros consistentes

### 3.2 Regla de oro

**NUNCA** recalcular accesibilidad por cuenta propia. **SIEMPRE** usar:
- `getAccessiblePropertiesAndTenants()` para obtener propertyIds y tenantIds
- `getCleanerScope()` para obtener el scope completo
- `getCleanerCleaningsList()` para obtener listas
- `getCleanerCleaningsCounts()` para obtener contadores

### 3.3 Excepción permitida

El **calendario** puede usar query directa SOLO para pintar eventos del mes visible, pero:
- NO define contadores
- NO define listas principales
- DEBE usar el mismo scope (propertyIds/tenantIds) que el query layer

---

## 4. Definiciones canónicas (Scopes) — EXACTAS

### 4.1 Disponibles

**Definición:**
- `assignmentStatus = "OPEN"`
- `assignedMembershipId IS NULL`
- `assignedMemberId IS NULL`
- `status != "CANCELLED"`
- `scheduledDate >= availabilityStart` (según `getAvailabilityWindow()`)

**Implementación en query layer:**
```typescript
scope: "available"
```

**Nota:** `availabilityStart` se calcula usando `getAvailabilityStartDate(now)` y puede incluir un margen hacia atrás según la configuración del sistema.

---

### 4.2 Mis limpiezas (Assigned to me)

**Definición:**
- `assignmentStatus = "ASSIGNED"`
- En membership mode: `assignedMembershipId IN myMembershipIds`
- En legacy mode: `assignedMemberId = myLegacyMemberId`
- Para contadores/dashboard: `status IN ["PENDING", "IN_PROGRESS"]`
- Para "Todas" (si `includeCompleted=true`): puede incluir `COMPLETED`

**Implementación en query layer:**
```typescript
scope: "assigned"
includeCompleted: false  // Para dashboard
includeCompleted: true   // Para "Todas las limpiezas"
```

**Variantes:**
- **Dashboard "Hoy"**: Solo PENDING e IN_PROGRESS
- **Vista "Todas"**: Puede incluir COMPLETED si el usuario lo solicita

---

### 4.3 Próximas (7 días)

**Definición:**
- Subconjunto de "Mis limpiezas"
- `scheduledDate BETWEEN startOfTodayLocal AND now+7d`
- `status IN ["PENDING", "IN_PROGRESS"]`

**NOTA CRÍTICA:** `startOfTodayLocal` significa inicio del día (00:00:00), **NO** la hora actual (`now`). Esto asegura que limpiezas de hoy a horas ya pasadas aparezcan en "Próximas".

**Implementación en query layer:**
```typescript
scope: "upcoming"
```

**Helper interno:**
```typescript
function startOfTodayLocal(now: Date): Date {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return startOfToday;
}
```

**Ejemplo:**
- Si son las 16:00 y hay una limpieza PENDING programada para hoy a las 11:00
- Debe aparecer en "Próximas" porque `scheduledDate >= startOfToday` (00:00) y `scheduledDate <= now+7d`

---

### 4.4 Historial

**Definición:**
- Limpiezas asignadas a mí con `status = "COMPLETED"`
- Opcionalmente puede incluir `CANCELLED` si se define explícitamente
- Mismo filtro de asignación que "Mis limpiezas"

**Implementación en query layer:**
```typescript
scope: "history"
status: ["COMPLETED"]  // o ["COMPLETED", "CANCELLED"] si aplica
```

---

## 5. Comportamiento de las Cards (KPIs)

### 5.1 Card "Mis limpiezas"

**Contador:**
- Muestra `assignedToMeCount` de `getCleanerCleaningsCounts()`
- Incluye solo limpiezas con `status IN ["PENDING", "IN_PROGRESS"]`

**Navegación al click:**
- Ruta: `/cleaner/cleanings/all?scope=all`
- Parámetros opcionales: `memberId`, `returnTo`
- La vista destino mapea `scope=all` internamente a `scope="assigned"` con `includeCompleted: true`
- Esto permite ver todas las limpiezas asignadas (PENDING, IN_PROGRESS, COMPLETED)

**Regla de consistencia:**
- Si `assignedToMeCount > 0`, la vista `/cleaner/cleanings/all?scope=all` NO debe estar vacía
- La vista usa `getCleanerCleaningsList({ scope: "assigned", includeCompleted: true })` para incluir COMPLETED
- El count de la card solo incluye PENDING e IN_PROGRESS, pero la vista puede mostrar más (incluyendo COMPLETED)

---

### 5.2 Card "Disponibles"

**Contador:**
- Muestra `availableCount` de `getCleanerCleaningsCounts()`
- Incluye solo limpiezas OPEN, sin asignar, futuras

**Navegación al click:**
- Ruta: `/cleaner/cleanings/available`
- Parámetros opcionales: `memberId`, `returnTo`
- La vista destino debe mostrar limpiezas disponibles (mismo scope que el count)

**Regla de consistencia:**
- Si `availableCount > 0`, la vista `/cleaner/cleanings/available` NO debe estar vacía
- La vista debe usar `getCleanerCleaningsList({ scope: "available" })`

---

### 5.3 Card "Próximas limpiezas"

**Contador:**
- Muestra `upcoming7dCount` de `getCleanerCleaningsCounts()`
- Incluye solo limpiezas asignadas a mí, próximos 7 días (desde inicio del día), status PENDING o IN_PROGRESS

**Navegación al click:**
- Ruta: `/cleaner/cleanings/all?scope=upcoming`
- Parámetros opcionales: `memberId`, `returnTo`
- La vista destino debe mostrar limpiezas próximas (mismo scope que el count)

**Regla de consistencia:**
- Si `upcoming7dCount > 0`, la vista `/cleaner/cleanings/all?scope=upcoming` NO debe estar vacía
- La vista debe usar `getCleanerCleaningsList({ scope: "upcoming" })`

---

### 5.4 Regla clave de consistencia

**INVARIANTE:** Si un count > 0, la vista destino NO debe estar vacía cuando se usa el mismo scope y rango.

Esto se garantiza porque:
- Los contadores usan `getCleanerCleaningsCounts()`
- Las listas usan `getCleanerCleaningsList()` con el mismo scope
- Ambos usan el mismo filtro base (`getCleanerScope()`)

---

## 6. Secciones del Dashboard (Hoy)

### 6.1 Calendario (mensual / día)

**Propósito:**
- Visualización de eventos de limpiezas en formato calendario
- Permite navegar por meses y días

**Comportamiento:**
- Es **visualización**, no fuente de verdad de contadores
- Debe mostrar eventos consistentes con el scope del usuario (mismos propertyIds/tenantIds)
- NO necesita match 1:1 con "Próximas" si el calendario muestra el mes completo

**Tipos de eventos mostrados:**
- Mis limpiezas (asignadas a mí)
- Limpiezas del equipo (asignadas a otros miembros de mis teams)
- Disponibles (OPEN, sin asignar)
- Perdidas (OPEN pasadas sin asignar, solo para contexto visual)

**Rango:**
- Vista mes: mes visible +/- 7 días de padding
- Vista día: día seleccionado completo

**Excepción permitida:**
- El calendario puede usar query directa para obtener eventos del rango visible
- Pero DEBE usar el mismo scope (propertyIds/tenantIds) que el query layer

---

### 6.2 Sección "Mis limpiezas" (lista)

**Título:** "Mis limpiezas"

**Contenido:**
- Lista de limpiezas asignadas a mí usando `getCleanerCleaningsList({ scope: "assigned", includeCompleted: false })`
- Máximo N items mostrados (actualmente: todas las del rango extendido, sin límite artificial)
- Filtros locales (client-side): "Pendientes" (PENDING) / "En progreso" (IN_PROGRESS)

**Comportamiento:**
- Sección colapsable (CollapsibleSection)
- Muestra contador local basado en filtro activo
- Cada item navega a `/cleaner/cleanings/[id]?memberId=...&returnTo=...`

**CTA "Ver todas":**
- Link a `/cleaner/cleanings/all?scope=all`
- Permite ver todas las limpiezas asignadas (incluyendo COMPLETED si aplica)

**Regla de consistencia:**
- El contador de la sección debe coincidir con el filtro aplicado
- Si el filtro es "Pendientes", el contador muestra solo PENDING
- Si el filtro es "En progreso", el contador muestra solo IN_PROGRESS

---

### 6.3 Sección "Disponibles" (lista)

**Título:** "Disponibles"

**Contenido:**
- Lista de limpiezas disponibles usando `getCleanerCleaningsList({ scope: "available" })`
- Máximo N items mostrados (actualmente: todas las del rango extendido, sin límite artificial)
- Cada item muestra botón "Aceptar" que ejecuta `acceptCleaning` action

**Comportamiento:**
- Sección colapsable (CollapsibleSection)
- Muestra contador `availableCount` (debe coincidir con la card)
- Cada item navega a `/cleaner/cleanings/[id]?returnTo=...` (preview mode)
- Botón "Aceptar" ejecuta server action y redirige según `returnTo`

**Regla de consistencia:**
- El contador de la sección debe coincidir con `availableCount` de la card
- Si `availableCount > 0`, la lista NO debe estar vacía

---

### 6.4 Sección "Próximas" (lista)

**DECISIÓN DE CONTRATO (Opción A — Implementada):**

**NO existe lista "Próximas" en `/cleaner`.**

Solo existe la **Card "Próximas limpiezas"** que navega a `/cleaner/cleanings/all?scope=upcoming`.

**Justificación:**
- Evita duplicación de información (ya está en "Mis limpiezas")
- La card es suficiente para acceso rápido
- La vista dedicada (`/cleaner/cleanings/all?scope=upcoming`) proporciona filtros y contexto completo

**Opción B (No implementada, futura):**
Si en el futuro se requiere una mini-lista de "Próximas" en el dashboard:
- Debe usar `getCleanerCleaningsList({ scope: "upcoming" })`
- Máximo 3-5 items
- Link a `/cleaner/cleanings/all?scope=upcoming` para ver todas

**⚠️ IMPORTANTE:** Si se implementa Opción B en el futuro, este contrato DEBE actualizarse explícitamente.

---

## 7. Navegación y parámetros

### 7.1 Query params soportados

#### `/cleaner/cleanings/all`

**Parámetros:**
- `scope`: `"assigned" | "upcoming" | "history" | "all"` (default: `"all"`)
- `month`: `YYYY-MM` (opcional, para filtrar por mes)
- `propertyId`: ID de propiedad (opcional)
- `status`: `"PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"` (opcional)
- `memberId`: ID de miembro legacy (opcional, para compatibilidad)
- `returnTo`: Ruta de retorno (opcional, debe ser `/cleaner...`)

**Ejemplos:**
- `/cleaner/cleanings/all?scope=upcoming` → Próximas 7 días
- `/cleaner/cleanings/all?scope=assigned&month=2025-01` → Mis limpiezas del mes
- `/cleaner/cleanings/all?scope=history&status=COMPLETED` → Historial completado

#### `/cleaner/cleanings/available`

**Parámetros:**
- `memberId`: ID de miembro legacy (opcional)
- `returnTo`: Ruta de retorno (opcional)

**Nota:** Esta ruta siempre muestra scope "available", no acepta parámetro `scope`.

---

### 7.2 Parámetro `returnTo`

**Reglas:**
- `returnTo` siempre debe ser una ruta `/cleaner...` válida
- Si no se proporciona o es inválido, default: `/cleaner` o `/cleaner/cleanings/available` según contexto
- Se usa para navegación de retorno desde páginas de detalle

**Ejemplos válidos:**
- `/cleaner`
- `/cleaner?memberId=xxx`
- `/cleaner/cleanings/available`
- `/cleaner/cleanings/all?scope=upcoming`

**Ejemplos inválidos (deben ser rechazados):**
- `/host/...` (diferente dominio)
- `https://external.com` (open redirect)
- Rutas no existentes

---

### 7.3 Navegación desde cards

**Card "Mis limpiezas":**
```
/cleaner/cleanings/all?scope=all&memberId={memberId}&returnTo={returnTo}
```

**Card "Disponibles":**
```
/cleaner/cleanings/available?memberId={memberId}&returnTo={returnTo}
```

**Card "Próximas limpiezas":**
```
/cleaner/cleanings/all?scope=upcoming&memberId={memberId}&returnTo={returnTo}
```

---

## 8. Permisos y seguridad

### 8.1 Preview vs Full detail

**Ya definido en contratos anteriores:**
- Cleaner puede ver detalles básicos antes de aceptar (preview mode)
- No ver accesos/wifi/códigos hasta aceptar
- Ver: propiedad, fecha, estado, notas, checklist (sin inventario)

**Referencia:** `docs/contracts/CLEANING_DETAIL_UX_V1.md` (Host), comportamiento equivalente aplica a Cleaner.

---

### 8.2 Alertas Host-only

**Regla:**
- "Atención requerida" (banners de configuración del Host) **NO debe mostrarse** en rutas `/cleaner`
- Estas alertas son exclusivas del dominio Host (`/host/cleanings/[id]`)

**Ejemplos de alertas NO permitidas en Cleaner:**
- "No hay equipos disponibles para esta propiedad"
- "Ir a propiedad y configurar equipo"
- Cualquier CTA que implique configuración del Host

---

### 8.3 Multi-tenant seguro

**Regla:**
- Todas las queries deben usar `getAccessiblePropertiesAndTenants()` que:
  - Prioriza `WorkGroupExecutor` (WGE) para obtener `hostTenantIds`
  - Hace fallback a `PropertyTeam` (legacy) para `servicesTenantIds`
  - Retorna `propertyIds` y `tenantIds` correctos según la fuente

**NUNCA:**
- Filtrar `Cleaning.tenantId` usando solo `servicesTenantId` en membership mode
- Asumir que todas las limpiezas están en el mismo tenant que el Team

---

## 9. Criterios de aceptación (QA)

### 9.1 Consistencia counts vs listas

- ✅ Counts coinciden con listas (mismo scope)
- ✅ Click en cards lleva a vistas no vacías cuando `count > 0`
- ✅ "Mis limpiezas" card count coincide con sección "Mis limpiezas" (filtro "Pendientes" + "En progreso")
- ✅ "Disponibles" card count coincide con sección "Disponibles"
- ✅ "Próximas" card count coincide con `/cleaner/cleanings/all?scope=upcoming`

---

### 9.2 Comportamiento "Próximas"

- ✅ "Próximas" incluye limpiezas de hoy aunque la hora ya pasó (usa `startOfToday`, no `now`)
- ✅ Si hay una limpieza PENDING hoy a las 11:00 y son las 16:00, aparece en "Próximas"
- ✅ Rango correcto: desde inicio del día (00:00) hasta `now+7d` (23:59:59)

---

### 9.3 Multi-tenant

- ✅ Disponibles y Assigned no mezclan tenants incorrectos
- ✅ Limpiezas en `hostTenantId` son visibles si hay WGE activo
- ✅ Limpiezas en `servicesTenantId` son visibles si hay PropertyTeam activo
- ✅ No aparecen limpiezas de tenants no accesibles

---

### 9.4 UI/UX

- ✅ No aparece alerta host-only en cleaner
- ✅ Preview mode funciona: se ven detalles básicos antes de aceptar
- ✅ Full detail funciona: se ven accesos/wifi después de aceptar
- ✅ Navegación `returnTo` funciona correctamente

---

### 9.5 Calendario

- ✅ Calendario muestra eventos consistentes con scope del usuario
- ✅ No hay duplicación ni faltantes por tenant incorrecto
- ✅ Eventos del calendario coinciden con listas (mismo scope base)

---

## 10. Referencias

### 10.1 Documentos relacionados

- `docs/debug/CLEANER_COUNTS_MISMATCH.md` — Diagnóstico de inconsistencias (resuelto)
- `lib/cleaner/cleanings/query.ts` — Query layer canónico (source of truth técnico)
- `docs/contracts/CLEANING_ASSIGNMENT_V1.md` — Contrato de asignación (Host)
- `docs/contracts/CLEANING_DETAIL_UX_V1.md` — Contrato UX de detalle (Host, referencia para Cleaner)

### 10.2 Contratos anteriores

**No existen contratos anteriores específicos para el Dashboard Cleaner "Hoy".**

Si en el futuro se encuentran documentos que contradigan este contrato, deben marcarse como **deprecated** y referenciar este documento como canónico.

---

## 11. Implementación técnica

### 11.1 Archivos clave

**Dashboard principal:**
- `app/cleaner/page.tsx` — Página principal del dashboard

**Componentes:**
- `app/cleaner/SummaryCards.tsx` — Cards de resumen (KPIs)
- `app/cleaner/MyCleaningsSection.tsx` — Sección "Mis limpiezas"
- `app/cleaner/AvailableCleaningsSection.tsx` — Sección "Disponibles"

**Query layer:**
- `lib/cleaner/cleanings/query.ts` — Source of truth canónico

**Vistas derivadas:**
- `app/cleaner/cleanings/all/page.tsx` — Vista "Todas las limpiezas" con tabs
- `app/cleaner/cleanings/available/page.tsx` — Vista "Disponibles"

---

### 11.2 Flujo de datos

```
1. Usuario accede a /cleaner
2. app/cleaner/page.tsx:
   a. Resuelve contexto (resolveCleanerContext)
   b. Obtiene counts (getCleanerCleaningsCounts)
   c. Obtiene listas (getCleanerCleaningsList con scope="assigned" y "available")
   d. Renderiza cards y secciones
3. Usuario click en card:
   a. Navega a vista derivada (/cleaner/cleanings/all o /available)
   b. Vista usa mismo query layer con mismo scope
   c. Resultado: lista no vacía si count > 0
```

---

### 11.3 Ejemplo de uso del query layer

```typescript
// Obtener contadores
const counts = await getCleanerCleaningsCounts(context);
const { assignedToMeCount, availableCount, upcoming7dCount } = counts;

// Obtener listas
const assignedResult = await getCleanerCleaningsList(
  { scope: "assigned", includeCompleted: false },
  context
);
const availableResult = await getCleanerCleaningsList(
  { scope: "available" },
  context
);

// Las listas y counts usan el mismo filtro base
// Garantía: assignedResult.cleanings.length puede diferir de assignedToMeCount
// solo por filtros de fecha (rango extendido vs sin rango), pero el scope es idéntico
```

---

## 12. Decisiones de diseño documentadas

### 12.1 "Próximas" solo como card (Opción A)

**Decisión:** No hay lista "Próximas" en el dashboard, solo card que navega a vista dedicada.

**Razón:** Evita duplicación y mantiene el dashboard enfocado en lo más relevante.

**Si cambia:** Este contrato debe actualizarse explícitamente.

---

### 12.2 Rango extendido para calendario

**Decisión:** El dashboard carga un rango extendido (mes +/- padding) para el calendario, pero las listas principales usan rangos más específicos.

**Razón:** El calendario necesita contexto visual del mes completo, pero las listas deben ser concisas.

**Implementación:** `extendedRangeStart` y `extendedRangeEnd` se usan para queries del calendario, pero las listas filtran después por rango específico.

---

### 12.3 Filtros locales en "Mis limpiezas"

**Decisión:** La sección "Mis limpiezas" tiene filtros client-side ("Pendientes" / "En progreso") que no afectan el count de la card.

**Razón:** El count de la card muestra el total (PENDING + IN_PROGRESS), mientras que los filtros permiten ver subconjuntos sin recargar.

**Consistencia:** El contador de la sección (mostrado en CollapsibleSection) refleja el filtro activo, no el count de la card.

---

## 13. Cambios futuros y evolución

### 13.1 Cómo modificar este contrato

1. Identificar la necesidad de cambio
2. Actualizar este documento con versión nueva (v1.1, v1.2, etc.)
3. Actualizar código para cumplir el nuevo contrato
4. Verificar que no se rompen invariantes existentes

### 13.2 Invariantes que NO deben romperse

- Contadores y listas siempre usan el mismo scope base
- "Próximas" siempre usa `startOfToday`, nunca `now`
- Multi-tenant seguro: siempre usar `getAccessiblePropertiesAndTenants()`
- No mostrar alertas host-only en rutas `/cleaner`

---

## 14. Checklist de validación

Al implementar cambios en el Dashboard Cleaner "Hoy", verificar:

- [ ] Los contadores usan `getCleanerCleaningsCounts()`
- [ ] Las listas usan `getCleanerCleaningsList()` con scope correcto
- [ ] "Próximas" usa `startOfToday` (no `now`)
- [ ] Cards navegan a rutas correctas según este contrato
- [ ] No hay queries ad-hoc que dupliquen lógica del query layer
- [ ] Multi-tenant seguro: se usa `getAccessiblePropertiesAndTenants()`
- [ ] No aparecen alertas host-only en `/cleaner`
- [ ] `returnTo` siempre es ruta `/cleaner...` válida
- [ ] Si count > 0, la vista destino no está vacía

---

**Fin del contrato**

