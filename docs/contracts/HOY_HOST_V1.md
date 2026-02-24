# Hoy (Host) — Contrato v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Documentación inicial del flujo completo  
**Alcance:** Host — Panel de actividad y navegación derivada

---

## 1. Header

**Ruta canónica:** `/host/hoy`

**Propósito:** Panel central de actividad para usuarios Host que muestra tareas y actividades que requieren atención, organizadas por tiempo (hoy vs próximas).

**Usuarios objetivo:** Todos los roles Host (OWNER, ADMIN, MANAGER, AUXILIAR)

**Redirecciones automáticas:**
- `/host` → `/host/hoy`
- `/host/dashboard` → `/host/hoy`
- `/app` (con role Host) → `/host/hoy`

---

## 2. Estructura de la página principal

### 2.1 Header de página

**Componente:** `Page` (de `@/lib/ui/Page`)

**Título:** "Actividad"

**Subtítulo:** "Tareas y actividades que requieren tu atención"

**Variant:** Por defecto (no `compact`)

**Back button:** No se muestra (página raíz del flujo Host)

---

### 2.2 Tabs superiores

**Componente:** Tabs custom (implementado en `HoyClient.tsx`)

**Tabs disponibles:**
1. **"Hoy"** (tab por defecto)
   - Muestra actividades del día actual
   - Parámetro URL: `tab` ausente o `tab=hoy`
2. **"Próximas"**
   - Muestra actividades de los próximos 7 días (mañana hasta +7 días)
   - Parámetro URL: `tab=proximas`

**Comportamiento:**
- Cambio de tab preserva el filtro de propiedad activo
- Cambio de tab actualiza la URL sin recargar la página completa
- Estado activo se indica con borde inferior negro (`border-b-2 border-black`)

**Posicionamiento:** Misma fila que el selector de propiedad (flex layout)

---

### 2.3 Filtro global de propiedad

**Componente móvil:** `PropertyFilterIconButton` (de `@/lib/ui/PropertyFilterIconButton`)  
**Componente desktop:** `PropertyPicker` (de `@/lib/ui/PropertyPicker`)

**Breakpoint:** `sm` (móvil: icono, desktop: dropdown)

**Opciones:**
- "Todas las propiedades" (valor vacío `""`)
- Lista de propiedades activas (`isActive: true`) ordenadas por `shortName` ascendente

**Comportamiento:**
- Cambio de filtro preserva el tab activo
- Cambio de filtro actualiza la URL y recarga datos
- Parámetro URL: `propertyId=<id>` (ausente si "Todas las propiedades")

**Posicionamiento:** Misma fila que los tabs, alineado a la derecha (`justify-between`)

---

### 2.4 Contenido del tab activo

**Componentes:**
- Tab "Hoy": `HoyTabContent`
- Tab "Próximas": `ProximasTabContent`

**Estructura:** Lista vertical de bloques (`space-y-6`)

---

## 3. Bloques de actividad

### 3.1 Definición de bloque

Cada bloque es una **tarjeta clickeable** (`Link`) que muestra:

**Estructura visual:**
- Tarjeta con borde (`rounded-2xl border border-neutral-200 bg-white p-4`)
- Efecto hover (`hover:bg-neutral-50 transition`)
- Título con contador: `"Título del bloque (N)"` donde N es el número total de items
- Lista preview de hasta 5 items (si `count > 0`)
- Separador visual entre título y lista (`border-t border-neutral-100`)

**Datos por item (preview):**
- Nombre de propiedad (`propertyName`)
- Fecha/hora formateada (si aplica)
- Formato de fecha: `DD MMM` (con hora si `hasTime`, sin año)

**Regla de visibilidad:** Un bloque **solo se muestra si `count > 0`**

---

### 3.2 Tab "Hoy" — Bloques disponibles

**Orden canónico (de arriba hacia abajo):**

1. **"Limpiezas sin confirmar"**
   - **Criterio:** Limpiezas con `needsAttention: true` y `scheduledDate` cae hoy (00:00:00 - 23:59:59)
   - **Ruta de navegación:** `/host/actividad/limpiezas/sin-confirmar?from=...&propertyId=...&tab=hoy`
   - **Datos mostrados:** `unconfirmedCleanings` (de `getHoyData`)

2. **"Incidencias abiertas"**
   - **Criterio:** `InventoryReport` con `status: PENDING` (sin filtro de fecha)
   - **Ruta de navegación:** `/host/actividad/incidencias/abiertas?from=...&propertyId=...`
   - **Datos mostrados:** `openIncidents` (de `getHoyData`)

3. **"Limpiezas de hoy"**
   - **Criterio:** Limpiezas con `scheduledDate` cae hoy y `status != "CANCELLED"`
   - **Ruta de navegación:** `/host/actividad/limpiezas/hoy?from=...&propertyId=...`
   - **Datos mostrados:** `todayCleanings` (de `getHoyData`)

4. **"Reservas para hoy"**
   - **Criterio:** Reservas con `startDate` cae hoy y `status NOT IN ["CANCELLED", "BLOCKED"]`
   - **Ruta de navegación:** `/host/actividad/reservas/hoy?from=...&propertyId=...`
   - **Datos mostrados:** `todayReservations` (de `getHoyData`)

**Nota:** El bloque "Mantenimiento pendiente" **NO se muestra nunca** (comentado en código).

---

### 3.3 Tab "Próximas" — Bloques disponibles

**Orden canónico (de arriba hacia abajo):**

1. **"Incidencias abiertas"**
   - **Criterio:** `InventoryReport` con `status: PENDING` (sin filtro de fecha)
   - **Ruta de navegación:** `/host/actividad/incidencias/abiertas?from=...&propertyId=...`
   - **Datos mostrados:** `openIncidents` (de `getProximasData`)

2. **"Limpiezas sin confirmar"**
   - **Criterio:** Limpiezas con `needsAttention: true` y `scheduledDate` entre mañana y +7 días
   - **Ruta de navegación:** `/host/actividad/limpiezas/sin-confirmar?from=...&propertyId=...&tab=proximas`
   - **Datos mostrados:** `unconfirmedCleanings` (de `getProximasData`)

3. **"Próximas limpiezas"**
   - **Criterio:** Limpiezas con `scheduledDate` entre mañana y +7 días y `status != "CANCELLED"`
   - **Ruta de navegación:** `/host/actividad/limpiezas/proximas?from=...&propertyId=...`
   - **Datos mostrados:** `upcomingCleanings` (de `getProximasData`)

4. **"Próximas reservas"**
   - **Criterio:** Reservas con `startDate` entre mañana y +7 días y `status != "CANCELLED"`
   - **Ruta de navegación:** `/host/actividad/reservas/proximas?from=...&propertyId=...`
   - **Datos mostrados:** `upcomingReservations` (de `getProximasData`)

---

### 3.4 Estado vacío

**Componente:** `EmptyState` (de `app/host/hoy/EmptyState.tsx`)

**Condición:** Se muestra cuando **TODOS los bloques relevantes tienen `count === 0`**

**Mensajes:**
- Tab "Hoy": `"Todo está en orden hoy.\nNo hay tareas pendientes ni incidencias que atender."`
- Tab "Próximas": `"No hay pendientes próximos.\nTodo está planificado para los siguientes días."`

**Estilo:** Tarjeta con borde punteado (`border-dashed border-neutral-300`), texto centrado, múltiples líneas soportadas.

---

## 4. Páginas de listado derivadas

### 4.1 Estructura común

Todas las páginas de listado comparten:

**Componente de página:** `Page` (de `@/lib/ui/Page`)

**Características:**
- Título específico del listado
- Botón "Volver" (`showBack`) que navega al contexto de origen
- Lista de items usando `ListContainer` y `ListRow`
- Estado vacío consistente

**Parámetros URL:**
- `propertyId` (opcional): Filtro de propiedad activo
- `from` (obligatorio): URL de retorno segura (debe empezar con `/host`)
- `tab` (opcional, solo para "Limpiezas sin confirmar"): `hoy` o `proximas`

**Función `safeReturnTo`:**
```typescript
function safeReturnTo(from?: string): string {
  if (from && from.startsWith("/host")) {
    return from;
  }
  return "/host/hoy";
}
```

**Navegación hacia detalle:**
- Cada `ListRow` navega a la página de detalle correspondiente
- El `returnTo` del detalle apunta a **esta página de listado** (no a `/host/hoy`)
- Se preserva `propertyId` en la navegación hacia detalle

---

### 4.2 `/host/actividad/limpiezas/sin-confirmar`

**Título:** "Limpiezas sin confirmar"

**Datos:** `getAllUnconfirmedCleanings(tenantId, propertyId, isUpcoming)`

**Lógica de `isUpcoming`:**
- Se determina desde el parámetro `from`: si contiene `tab=proximas`, entonces `isUpcoming = true`
- Si no, `isUpcoming = false` (tab "Hoy")

**Items mostrados:**
- Nombre de propiedad (`propertyName`)
- Fecha formateada: `DD MMM YYYY` (con hora si aplica)

**Navegación hacia detalle:**
- Ruta: `/host/cleanings/[id]?returnTo=<currentViewUrl>&propertyId=...`
- `currentViewUrl` incluye todos los parámetros de esta vista (`propertyId`, `from`, `tab`)

**Estado vacío:** `"No hay resultados."`

---

### 4.3 `/host/actividad/limpiezas/hoy`

**Título:** "Limpiezas de hoy"

**Datos:** `getAllTodayCleanings(tenantId, propertyId)`

**Criterio de fecha:** `scheduledDate` cae hoy (00:00:00 - 23:59:59)

**Items mostrados:**
- Nombre de propiedad (`propertyName`)
- Fecha formateada: `DD MMM YYYY` (con hora si aplica)

**Navegación hacia detalle:**
- Ruta: `/host/cleanings/[id]?returnTo=<currentViewUrl>&propertyId=...`

**Estado vacío:** `"No hay resultados."`

---

### 4.4 `/host/actividad/limpiezas/proximas`

**Título:** "Próximas limpiezas"

**Datos:** `getAllUpcomingCleanings(tenantId, propertyId)`

**Criterio de fecha:** `scheduledDate` entre mañana (00:00:00) y +7 días (23:59:59)

**Items mostrados:**
- Nombre de propiedad (`propertyName`)
- Fecha formateada: `DD MMM YYYY` (con hora si aplica)

**Navegación hacia detalle:**
- Ruta: `/host/cleanings/[id]?returnTo=<currentViewUrl>&propertyId=...`

**Estado vacío:** `"No hay resultados."`

---

### 4.5 `/host/actividad/reservas/hoy`

**Título:** "Reservas para hoy"

**Datos:** `getAllTodayReservations(tenantId, propertyId)`

**Criterio de fecha:** `startDate` cae hoy (00:00:00 - 23:59:59) y `status NOT IN ["CANCELLED", "BLOCKED"]`

**Items mostrados:**
- Nombre de propiedad (`propertyName`)
- Fecha formateada: `DD MMM YYYY` (con hora si aplica)

**Navegación hacia detalle:**
- Ruta: `/host/reservations/[id]?returnTo=<currentViewUrl>&propertyId=...`

**Estado vacío:** `"No hay resultados."`

---

### 4.6 `/host/actividad/reservas/proximas`

**Título:** "Próximas reservas"

**Datos:** `getAllUpcomingReservations(tenantId, propertyId)`

**Criterio de fecha:** `startDate` entre mañana (00:00:00) y +7 días (23:59:59) y `status != "CANCELLED"`

**Items mostrados:**
- Nombre de propiedad (`propertyName`)
- Fecha formateada: `DD MMM YYYY` (con hora si aplica)

**Navegación hacia detalle:**
- Ruta: `/host/reservations/[id]?returnTo=<currentViewUrl>&propertyId=...`

**Estado vacío:** `"No hay resultados."`

---

### 4.7 `/host/actividad/incidencias/abiertas`

**Título:** "Incidencias abiertas"

**Datos:** `getAllOpenIncidents(tenantId, propertyId)`

**Criterio:** `InventoryReport` con `status: PENDING` (sin filtro de fecha)

**Items mostrados:**
- Nombre de propiedad (`propertyName`)
- Fecha de creación formateada: `DD MMM YYYY` (con hora si aplica)

**Navegación hacia detalle:**
- Ruta: `/host/inventory/inbox?returnTo=<currentViewUrl>&propertyId=...`
- **Nota:** Las incidencias navegan al inbox de inventario, no a una página de detalle individual

**Estado vacío:** `"No hay resultados."`

---

## 5. Navegación y retorno

### 5.1 Flujo de navegación

**Desde "Hoy" → Listado:**
1. Usuario hace click en un bloque (ej: "Limpiezas sin confirmar")
2. Navega a `/host/actividad/limpiezas/sin-confirmar?from=/host/hoy?tab=hoy&propertyId=...`
3. El parámetro `from` preserva el contexto completo (tab + filtro de propiedad)

**Desde Listado → Detalle:**
1. Usuario hace click en un item del listado
2. Navega a `/host/cleanings/[id]?returnTo=/host/actividad/limpiezas/sin-confirmar?from=...&propertyId=...`
3. El `returnTo` apunta al **listado actual**, no a `/host/hoy`

**Desde Detalle → Regreso:**
1. Usuario presiona botón "Volver" en el detalle
2. Navega al `returnTo` recibido (listado específico)
3. Si no hay `returnTo` válido, fallback a `/host/cleanings?view=day&date=...`

---

### 5.2 Reglas de `returnTo`

**Construcción de `returnTo` desde "Hoy":**
```typescript
const buildReturnUrl = () => {
  const params = new URLSearchParams();
  params.set("tab", "hoy"); // o "proximas"
  if (selectedPropertyId) {
    params.set("propertyId", selectedPropertyId);
  }
  return `/host/hoy?${params.toString()}`;
};
```

**Construcción de `returnTo` desde Listado:**
```typescript
const currentViewParams = new URLSearchParams();
if (propertyId) {
  currentViewParams.set("propertyId", propertyId);
}
if (params?.from) {
  currentViewParams.set("from", params.from);
}
if (params?.tab) {
  currentViewParams.set("tab", params.tab);
}
const currentViewUrl = `/host/actividad/limpiezas/sin-confirmar?${currentViewParams.toString()}`;
```

**Validación de `returnTo` en Detalle:**
```typescript
function safeReturnTo(input?: string) {
  if (!input) return null;
  // Solo permitir rutas /host válidas
  if (
    input.startsWith("/host/cleanings") ||
    input.startsWith("/host/actividad") ||
    input.startsWith("/host/reservations")
  )
    return input;
  return null;
}
```

---

## 6. Detalle de limpieza — Observaciones conocidas

### 6.1 Inconsistencias documentadas

**⚠️ Observación conocida / Pendiente de definición de contrato**

En la página de detalle de limpieza (`/host/cleanings/[id]`), se observan las siguientes inconsistencias:

#### 6.1.1 Alerta de atención requerida

**Ubicación:** Componente `CleaningWarningCard`

**Mensaje observado:** "Atención requerida: No hay equipo asignado a esta limpieza"

**Código de razón:** `NO_TEAM_EXECUTING`

**Comportamiento actual:**
- Se muestra cuando `!cleaning.teamId && !cleaning.assignedMembershipId`
- Incluye CTA: "Ir a propiedad y configurar equipo" → `/host/properties/[id]`

**Inconsistencia:** El mensaje menciona "equipo" pero no distingue entre:
- Equipos de Host (Work Groups / Executors)
- Equipos de Services (Teams)

---

#### 6.1.2 Tarjeta de asignación

**Ubicación:** Componente `AssignmentSection`

**Mensaje observado:** "Ningún cleaner ha aceptado la limpieza"

**Condición:** Se muestra cuando `isUnassigned` (no hay `assignees` y no hay `primaryAssigneeId`)

**Inconsistencia:** El mensaje menciona "cleaner" (singular) pero no distingue entre:
- Asignación a nivel de equipo (Work Group Executor)
- Asignación a nivel de miembro individual (TeamMember / TeamMembership)

---

#### 6.1.3 Navegación a Detalle de propiedad

**Ubicación:** CTA en `CleaningWarningCard` y botón "Ver equipos" en `AssignmentSection`

**Comportamiento actual:**
- Al navegar a `/host/properties/[id]`, **sí se observan equipos/WG asignados**
- La propiedad muestra correctamente los Work Groups asignados vía `HostWorkGroupProperty`

**Inconsistencia:** 
- En el detalle de limpieza, no se muestra información clara sobre qué equipos están asignados a la propiedad
- El usuario debe navegar a la propiedad para ver esta información
- No hay distinción clara entre equipos de Host (WG) y equipos de Services (Teams)

---

### 6.2 Estado actual (sin correcciones)

**Propósito de esta sección:** Documentar el comportamiento observado sin proponer soluciones.

**Lenguaje inconsistente:**
- Se usa "equipo" y "cleaner" de forma intercambiable
- No se distingue entre Work Groups (Host) y Teams (Services)
- No se muestra información de equipos asignados a la propiedad en el detalle de limpieza

**Navegación requerida:**
- Para ver equipos asignados a la propiedad, el usuario debe navegar explícitamente a `/host/properties/[id]`
- El detalle de limpieza no muestra esta información de forma directa

---

## 7. Invariantes UX

### 7.1 Uso consistente de tabs

- Los tabs siempre están en la misma posición (arriba, misma fila que filtro)
- El estado activo se indica visualmente (borde inferior negro)
- El cambio de tab preserva filtros activos

---

### 7.2 Uso consistente de contadores

- Todos los bloques muestran contador en formato `"Título (N)"`
- El contador refleja el total de items, no solo los mostrados en preview
- Los contadores se actualizan al cambiar filtros

---

### 7.3 Uso consistente de navegación por listas

- Todas las páginas de listado usan `ListContainer` y `ListRow`
- El formato de items es consistente (nombre de propiedad + fecha)
- El estado vacío es consistente (tarjeta con borde punteado, texto centrado)

---

### 7.4 Consistencia visual con otras páginas

**Páginas de referencia:**
- `/host/reservations` (filtros similares, estructura de lista)
- `/host/cleanings` (navegación hacia detalle)

**Componentes reutilizados:**
- `Page`, `PageHeader` (estructura de página)
- `ListContainer`, `ListRow` (listas)
- `PropertyPicker`, `PropertyFilterIconButton` (filtros)
- `EmptyState` (estados vacíos)

---

## 8. Componentes UX reutilizados

### 8.1 Componentes de estructura

- **`Page`**: Contenedor principal de página con título y subtítulo
- **`PageHeader`**: Header con botón "Volver" y título/subtítulo
- **`ListContainer`**: Contenedor de lista con espaciado consistente
- **`ListRow`**: Item de lista clickeable con hover y separadores

---

### 8.2 Componentes de filtros

- **`PropertyPicker`**: Dropdown de selección de propiedad (desktop)
- **`PropertyFilterIconButton`**: Botón con icono para filtro de propiedad (móvil)
- **Breakpoint:** `sm` (640px)

---

### 8.3 Componentes de estado

- **`EmptyState`**: Mensaje de estado vacío con soporte para múltiples líneas

---

## 9. Datos y queries

### 9.1 Funciones de datos principales

**Archivo:** `app/host/hoy/data.ts`

**Funciones exportadas:**
- `getHoyData(tenantId, propertyId?)`: Datos para tab "Hoy"
- `getProximasData(tenantId, propertyId?)`: Datos para tab "Próximas"
- `getAllTodayCleanings(tenantId, propertyId?)`: Lista completa de limpiezas de hoy
- `getAllUpcomingCleanings(tenantId, propertyId?)`: Lista completa de próximas limpiezas
- `getAllUnconfirmedCleanings(tenantId, propertyId?, isUpcoming?)`: Lista completa de limpiezas sin confirmar
- `getAllTodayReservations(tenantId, propertyId?)`: Lista completa de reservas de hoy
- `getAllUpcomingReservations(tenantId, propertyId?)`: Lista completa de próximas reservas
- `getAllOpenIncidents(tenantId, propertyId?)`: Lista completa de incidencias abiertas

---

### 9.2 Estructura de datos

**Tipo `BlockData`:**
```typescript
interface BlockData {
  count: number;              // Total de items
  items: BlockItem[];         // Primeros 5 para preview en tarjeta
  allItems?: BlockItem[];     // Todos los items (para bottom sheet, si aplica)
}
```

**Tipo `BlockItem`:**
```typescript
interface BlockItem {
  id: string;
  title: string;               // Título descriptivo ("Limpieza sin confirmar", etc.)
  propertyName: string;       // Nombre corto o nombre completo de la propiedad
  date: string | null;         // ISO string de fecha
  status?: string;             // Estado opcional
  href: string;                // URL de navegación hacia detalle
}
```

---

### 9.3 Criterios de fecha

**"Hoy":**
- Inicio: `00:00:00` del día actual
- Fin: `23:59:59` del día actual

**"Próximas" (próximos 7 días):**
- Inicio: `00:00:00` de mañana
- Fin: `23:59:59` de +7 días desde hoy

**Helper functions:**
- `getStartOfToday()`: `Date` con horas/minutos/segundos en 0
- `getEndOfToday()`: `Date` con horas en 23, minutos/segundos en 59/999
- `getStartOfTomorrow()`: `Date` de mañana con horas/minutos/segundos en 0
- `getEndOfNext7Days()`: `Date` de +7 días con horas en 23, minutos/segundos en 59/999

---

## 10. Scoping y validaciones

### 10.1 Validaciones de tenant

- Todas las queries filtran por `tenantId` del tenant por defecto (`getDefaultTenant()`)
- Si no hay tenant, se muestra mensaje: "No se encontró ningún tenant. Crea uno en Prisma Studio para continuar."

---

### 10.2 Validaciones de propiedad

- El filtro `propertyId` es opcional
- Si se proporciona, se aplica a todas las queries de datos
- Las propiedades mostradas en el filtro son solo las activas (`isActive: true`)

---

### 10.3 Validaciones de fecha

- Las fechas se comparan usando objetos `Date` nativos de JavaScript
- Se normalizan a inicio/fin de día para comparaciones consistentes
- No se usan librerías externas de fecha (solo `Date.toLocaleDateString` para formato)

---

## 11. Performance y optimización

### 11.1 Queries paralelas

- En la página principal, se ejecutan `getHoyData` y `getProximasData` en paralelo (`Promise.all`)
- Las propiedades se obtienen en paralelo con los datos de actividad

---

### 11.2 Límites de preview

- Los bloques muestran máximo 5 items en preview (`items.slice(0, 5)`)
- El contador refleja el total real (`count`)
- Las páginas de listado muestran todos los items (sin límite)

---

### 11.3 Caching y revalidación

- Las páginas son Server Components (Next.js App Router)
- No hay estrategia de caching explícita documentada
- Los datos se obtienen en cada request del servidor

---

## 12. Checklist QA

### 12.1 Página principal "Hoy"

- [ ] La página carga con scoping correcto (tenant)
- [ ] Los tabs "Hoy" y "Próximas" funcionan correctamente
- [ ] El filtro de propiedad funciona (móvil y desktop)
- [ ] Los bloques solo se muestran si `count > 0`
- [ ] El estado vacío se muestra cuando todos los bloques están en 0
- [ ] La navegación desde bloques preserva `tab` y `propertyId`

---

### 12.2 Páginas de listado

- [ ] Cada página de listado muestra el título correcto
- [ ] El botón "Volver" navega al contexto correcto (`from`)
- [ ] Los items se muestran con formato consistente (propiedad + fecha)
- [ ] El estado vacío se muestra cuando no hay items
- [ ] La navegación hacia detalle preserva `returnTo` y `propertyId`

---

### 12.3 Navegación y retorno

- [ ] Desde "Hoy" → Listado: se preserva `tab` y `propertyId`
- [ ] Desde Listado → Detalle: `returnTo` apunta al listado actual
- [ ] Desde Detalle → Regreso: se navega al `returnTo` correcto
- [ ] Si no hay `returnTo` válido, fallback funciona correctamente

---

### 12.4 Consistencia visual

- [ ] Los bloques usan el mismo estilo visual (tarjeta con borde)
- [ ] Los listados usan `ListContainer` y `ListRow` consistentemente
- [ ] Los estados vacíos son consistentes entre páginas
- [ ] Los filtros funcionan igual en móvil y desktop

---

## 13. Notas de evolución

### 13.1 Mejoras futuras sugeridas

- Unificar lenguaje: distinguir entre "equipo" (Work Group) y "cleaner" (miembro individual)
- Mostrar información de equipos asignados a la propiedad directamente en el detalle de limpieza
- Agregar filtros adicionales (fecha, estado) en las páginas de listado
- Implementar paginación o scroll infinito en listados grandes
- Agregar indicadores de carga durante la obtención de datos

---

### 13.2 Dependencias conocidas

- La página depende de la estructura de datos de `Cleaning`, `Reservation`, `InventoryReport`
- Los filtros dependen de la estructura de `Property`
- La navegación hacia detalle depende de las rutas `/host/cleanings/[id]` y `/host/reservations/[id]`

---

**Fin del contrato**

