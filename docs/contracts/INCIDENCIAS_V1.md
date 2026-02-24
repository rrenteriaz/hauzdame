# Incidencias (Inbox de Inventario) — Contrato v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Contrato inicial  
**Alcance:** Sistema de inbox de inventario para revisión y resolución de cambios y reportes  

---

## 1. Propósito y alcance

### 1.1 Qué es Incidencias

**Incidencias** es un inbox de revisión y resolución para cambios y reportes relacionados con el inventario de propiedades. Funciona como un sistema de gestión de incidencias donde el Host puede revisar, aprobar, rechazar o resolver eventos generados durante el proceso de inventario en limpiezas.

### 1.2 Para qué sirve

- **Revisar cambios de cantidad:** Aprobar o rechazar cambios en las cantidades de items de inventario reportados por cleaners durante limpiezas.
- **Resolver reportes:** Gestionar reportes de problemas con items de inventario (daños, faltantes, etc.) mediante resoluciones específicas.
- **Centralizar gestión:** Proporcionar una vista unificada de todas las incidencias pendientes y resueltas relacionadas con inventario.

### 1.3 Qué NO es

- **NO es un sistema de notificaciones:** Las incidencias no generan notificaciones automáticas fuera de la página.
- **NO es un sistema de inventario completo:** No permite crear, editar o eliminar items de inventario directamente (eso se hace en la página de Inventario de cada propiedad).
- **NO es un sistema de mensajería:** No permite comunicación bidireccional con cleaners sobre las incidencias.
- **NO es un sistema de automatización:** Las acciones requieren intervención manual del Host.

---

## 2. Ubicación y acceso

### 2.1 Ruta

- **URL:** `/host/inventory/inbox`
- **Navegación:** Accesible desde el menú principal (tab "Incidencias") en la navegación inferior (móvil) y superior (desktop).

### 2.2 Título y subtítulo

- **Título:** "Inbox de inventario"
- **Subtítulo:** "Revisa y resuelve cambios y reportes de inventario"

---

## 3. Tipos de incidencias

### 3.1 Cambios de cantidad (CHANGE)

**Definición:** Cambios propuestos en la cantidad de un item de inventario reportados durante una limpieza.

**Información mostrada:**
- Nombre del item
- Thumbnail del item (si existe)
- Propiedad donde ocurrió el cambio
- Limpieza asociada (si existe, con link a detalle)
- Cantidad anterior → Cantidad nueva
- Razón del cambio (con texto adicional si aplica)
- Nota opcional del cleaner
- Fecha y hora de creación
- Usuario que reportó el cambio

**Estados posibles:**
- `PENDING`: Pendiente de revisión
- `APPLIED`: Aceptado y aplicado al inventario
- `REJECTED`: Rechazado por el Host
- `ACCEPTED`: Aceptado (estado intermedio, no visible en UI actual)

### 3.2 Reportes (REPORT)

**Definición:** Reportes de problemas o situaciones especiales con items de inventario.

**Información mostrada:**
- Nombre del item
- Thumbnail del item (si existe)
- Propiedad donde se reportó
- Limpieza asociada (si existe, con link a detalle)
- Tipo de reporte
- Severidad (URGENT, IMPORTANT, INFO)
- Descripción del problema
- Fecha y hora de creación
- Usuario que reportó
- Fecha de resolución (si está resuelto)
- Resolución del manager (si está resuelto)

**Estados posibles:**
- `PENDING`: Pendiente de resolución
- `RESOLVED`: Resuelto por el Host
- `ACKNOWLEDGED`: Reconocido (estado intermedio, no visible en UI actual)
- `REJECTED`: Rechazado (estado intermedio, no visible en UI actual)

**Severidades:**
- `URGENT`: Urgente (badge rojo)
- `IMPORTANT`: Importante (badge amarillo)
- `INFO`: Informativo (badge azul)

---

## 4. Estados y tabs

### 4.1 Tabs principales

La página tiene dos tabs:

1. **Pendientes (`pending`):**
   - Muestra todas las incidencias con estado `PENDING`
   - Incluye cambios pendientes y reportes pendientes
   - Contador: `totalPendings` (suma de cambios pendientes + reportes pendientes)

2. **Resueltos (`resolved`):**
   - Muestra todas las incidencias resueltas
   - Para cambios: estados `APPLIED`, `REJECTED`, `ACCEPTED`
   - Para reportes: estado `RESOLVED`
   - Contador: `totalResolved` (suma de cambios resueltos + reportes resueltos)

### 4.2 Tab por defecto

- Si no se especifica `tab` en los parámetros de URL, el tab por defecto es `pending`.

### 4.3 Contadores

Los contadores en los tabs reflejan el número total de incidencias según:
- El estado del tab (pendiente o resuelto)
- Los filtros aplicados (propiedad, tipo, severidad, fecha)
- El tenant del usuario actual

**MUST:** Los contadores deben actualizarse cuando cambian los filtros o se resuelven/aprueban incidencias.

---

## 5. Filtros disponibles

### 5.1 Filtro por Propiedad

- **Tipo:** Dropdown (desktop) / Bottom sheet (móvil)
- **Opciones:** "Todas" + lista de propiedades del tenant
- **Parámetro URL:** `propertyId`
- **Comportamiento:** Filtra incidencias por la propiedad asociada (vía limpieza o review).

### 5.2 Filtro por Tipo

- **Tipo:** Dropdown (desktop) / Bottom sheet (móvil)
- **Opciones:** "Todos", "Cambios de cantidad", "Reportes"
- **Parámetro URL:** `type` (valores: `CHANGE`, `REPORT`)
- **Comportamiento:** 
  - Si se selecciona "Cambios de cantidad", solo muestra cambios.
  - Si se selecciona "Reportes", solo muestra reportes y habilita el filtro de Severidad.
  - Si se cambia de "Reportes" a otro tipo, se limpia automáticamente el filtro de Severidad.

### 5.3 Filtro por Severidad

- **Tipo:** Dropdown (desktop) / Bottom sheet (móvil)
- **Disponibilidad:** Solo visible cuando `type === "REPORT"`
- **Opciones:** "Todas", "Urgente", "Importante", "Informativo"
- **Parámetro URL:** `severity` (valores: `URGENT`, `IMPORTANT`, `INFO`)
- **Comportamiento:** Filtra reportes por nivel de severidad.

### 5.4 Filtro por Fecha

- **Tipo:** Dropdown (desktop) / Bottom sheet (móvil)
- **Opciones:** "Todas", "Últimos 7 días", "Últimos 30 días"
- **Parámetro URL:** `dateRange` (valores: `7d`, `30d`, `all`)
- **Comportamiento:** Filtra incidencias por fecha de creación (`createdAt`).

### 5.5 Persistencia de filtros

- Los filtros se persisten en la URL como parámetros de búsqueda.
- Al cambiar un filtro, se actualiza la URL y se recarga la página con los nuevos filtros.
- Los filtros se mantienen al cambiar entre tabs.

---

## 6. Acciones disponibles

### 6.1 Para Cambios de cantidad (tab Pendientes)

**Acciones disponibles cuando `disabled === false`:**

1. **Aceptar y aplicar:**
   - Botón: "Aceptar y aplicar"
   - Acción: `applyInventoryChange(changeId)`
   - Comportamiento:
     - Actualiza el estado del cambio a `APPLIED`
     - Actualiza la cantidad esperada (`expectedQty`) en la línea de inventario activa correspondiente
     - Revalida las rutas `/host/inventory/inbox` y `/host/dashboard`
     - La incidencia desaparece del tab Pendientes y aparece en Resueltos

2. **Rechazar:**
   - Botón: "Rechazar"
   - Acción: `rejectInventoryChange(changeId)`
   - Comportamiento:
     - Actualiza el estado del cambio a `REJECTED`
     - NO modifica el inventario
     - Revalida las rutas `/host/inventory/inbox` y `/host/dashboard`
     - La incidencia desaparece del tab Pendientes y aparece en Resueltos

**MUST NOT:** Las acciones están deshabilitadas (`disabled={true}`) cuando:
- `isPending === true` (acción en progreso)
- `tab === "resolved"` (en el tab de resueltos, no se pueden realizar acciones)

### 6.2 Para Reportes (tab Pendientes)

**Acción disponible cuando `disabled === false`:**

1. **Resolver:**
   - Botón: "Resolver"
   - Acción: Abre modal `ResolveReportModal`
   - Comportamiento:
     - Muestra modal con opciones de resolución
     - Usuario debe seleccionar una resolución obligatoria
     - Al confirmar, ejecuta `resolveInventoryReport(reportId, resolution)`
     - Actualiza el estado del reporte a `RESOLVED`
     - Guarda la resolución seleccionada (`managerResolution`)
     - Guarda fecha de resolución (`resolvedAt`)
     - Si la resolución implica remover el item (`DISCARD`, `MARK_LOST`, `STORE`), desactiva todas las líneas activas del item y archiva el item si no tiene líneas activas
     - Revalida las rutas `/host/inventory/inbox` y `/host/dashboard`
     - La incidencia desaparece del tab Pendientes y aparece en Resueltos

**Resoluciones disponibles:**
- `REPAIR`: Reparar (el item será reparado y seguirá en uso)
- `KEEP_USING`: Seguir usando (el item se mantiene en uso sin cambios)
- `REPLACE_AND_DISCARD`: Reemplazar y desechar (se reemplazará el item y el actual se desechará)
- `DISCARD`: Desechar (el item será desechado y removido del inventario)
- `STORE`: Almacenar (el item será almacenado y removido del inventario activo)
- `MARK_LOST`: Marcar como extraviado (el item será marcado como extraviado)
- `UPDATE_ITEM_TO_NEW`: Actualizar item a nuevo (se actualizará la condición del item a nuevo)
- `MARK_TO_REPLACE`: Marcar para reemplazar (el item será marcado para reemplazo futuro)

**MUST NOT:** Las acciones están deshabilitadas cuando:
- `isPending === true` (acción en progreso)
- `tab === "resolved"` (en el tab de resueltos, no se pueden realizar acciones)

### 6.3 Acciones NO disponibles

- **Editar incidencia:** No existe acción para editar una incidencia después de crearla.
- **Comentar:** No existe sistema de comentarios en las incidencias.
- **Reabrir:** No existe acción para reabrir una incidencia resuelta.
- **Eliminar:** No existe acción para eliminar una incidencia.

---

## 7. Estados vacíos

### 7.1 Tab Pendientes

**Cuándo mostrar:** Cuando `items.length === 0` y `tab === "pending"`

**Mensaje canónico:**
- Texto: "No hay pendientes"
- Estilo: Centrado, texto neutral (`text-neutral-600`), dentro de un contenedor con borde y fondo blanco

### 7.2 Tab Resueltos

**Cuándo mostrar:** Cuando `items.length === 0` y `tab === "resolved"`

**Mensaje canónico:**
- Texto: "No hay items resueltos"
- Estilo: Centrado, texto neutral (`text-neutral-600`), dentro de un contenedor con borde y fondo blanco

**MUST NOT:**
- Mostrar estado vacío cuando hay items visibles
- Mostrar mensajes diferentes a los canónicos

---

## 8. Visualización de items

### 8.1 Tarjeta de incidencia

Cada incidencia se muestra en una tarjeta (`InventoryInboxItemCard`) con:

**Información común:**
- Thumbnail del item (64x64px, redondeado) o placeholder "Sin foto"
- Nombre del item (truncado si es muy largo)
- Nombre de la propiedad
- Link a limpieza asociada (si existe `cleaningId`)
- Badge de tipo ("Cambio" o "Reporte")
- Fecha y hora de creación (formato: "DD MMM HH:mm")
- Usuario que creó la incidencia

**Información específica por tipo:**

**Cambios:**
- Cantidad anterior → Cantidad nueva
- Razón del cambio (con texto adicional si aplica)
- Nota opcional

**Reportes:**
- Tipo de reporte
- Badge de severidad (con color según severidad)
- Descripción del problema

### 8.2 Ordenamiento

- Los items se ordenan por fecha de creación descendente (más recientes primero).
- El ordenamiento se aplica después de combinar cambios y reportes.

---

## 9. Manejo de errores

### 9.1 Mensajes de error

**Cuándo mostrar:** Cuando una acción falla (apply, reject, resolve)

**Ubicación:** Banner de error arriba de los tabs

**Estilo:**
- Fondo: `bg-red-50`
- Borde: `border-red-200`
- Texto: `text-red-800`
- Mensaje: El mensaje del error o un mensaje genérico si no hay mensaje específico

**Mensajes posibles:**
- "Error al aplicar el cambio"
- "Error al rechazar el cambio"
- "Error al resolver el reporte"
- Mensajes específicos del servidor (ej: "Este cambio ya fue procesado", "No tienes permiso para este cambio")

### 9.2 Estados de carga

- Durante acciones (`isPending === true`), los botones se deshabilitan y muestran estado `disabled`.
- No hay spinner global visible durante las acciones (solo deshabilitación de botones).

---

## 10. Permisos y visibilidad

### 10.1 Roles

**Host:**
- Acceso completo a todas las incidencias de su tenant
- Puede aprobar, rechazar y resolver incidencias
- Puede filtrar por todas las propiedades de su tenant

**Cleaner:**
- NO tiene acceso a esta página (no documentado en este contrato, fuera de alcance)

### 10.2 Scope de datos

- Las incidencias se filtran automáticamente por `tenantId` del usuario actual.
- Solo se muestran incidencias del tenant del Host autenticado.
- Las propiedades disponibles en el filtro son solo las del tenant actual.

---

## 11. Relación con otros módulos

### 11.1 Inventario

- Las incidencias están relacionadas con items de inventario (`InventoryItem`).
- Al aplicar un cambio, se actualiza la línea de inventario (`InventoryLine`) correspondiente.
- Al resolver un reporte con ciertas resoluciones, se pueden desactivar líneas de inventario o archivar items.

### 11.2 Limpiezas

- Las incidencias pueden estar asociadas a una limpieza (`cleaningId`).
- Si existe asociación, se muestra un link "Ver limpieza" que navega a `/host/cleanings/{cleaningId}`.
- Las incidencias se generan durante el proceso de revisión de inventario en limpiezas.

### 11.3 Dashboard

- El resumen de incidencias (`totalPendings`, `urgentReports`) puede aparecer en el dashboard (fuera del alcance de este contrato, solo se menciona la relación).

---

## 12. Invariantes UX (MUST NOT BREAK)

### 12.1 Contadores

- Los contadores en los tabs DEBEN reflejar el número real de items según filtros y estado.
- Los contadores DEBEN actualizarse inmediatamente después de resolver/aprobar/rechazar una incidencia.

### 12.2 Filtros

- Los filtros DEBEN persistirse en la URL.
- Al cambiar un filtro, la página DEBE recargarse con los nuevos resultados.
- El filtro de Severidad DEBE ocultarse cuando `type !== "REPORT"`.

### 12.3 Acciones

- Las acciones DEBEN estar deshabilitadas en el tab "Resueltos".
- Las acciones DEBEN estar deshabilitadas durante el procesamiento (`isPending === true`).
- Después de una acción exitosa, la incidencia DEBE desaparecer del tab actual y aparecer en el tab correspondiente.

### 12.4 Estados vacíos

- El mensaje de estado vacío DEBE corresponder al tab activo ("No hay pendientes" vs "No hay items resueltos").
- El estado vacío NO DEBE mostrarse cuando hay items visibles.

### 12.5 Ordenamiento

- Los items SIEMPRE se muestran ordenados por fecha de creación descendente (más recientes primero).

---

## 13. Archivos clave

### 13.1 Páginas

- `app/host/inventory/inbox/page.tsx`: Página servidor que obtiene datos iniciales y renderiza el cliente

### 13.2 Componentes cliente

- `app/host/inventory/inbox/InventoryInboxClient.tsx`: Componente principal que maneja estado, filtros y acciones
- `app/host/inventory/inbox/InventoryInboxItemCard.tsx`: Componente que renderiza cada tarjeta de incidencia
- `app/host/inventory/inbox/ResolveReportModal.tsx`: Modal para resolver reportes con selección de resolución

### 13.3 Acciones servidor

- `app/host/inventory/inbox/actions.ts`: Funciones servidor para obtener datos y ejecutar acciones
  - `getInventoryInboxSummary()`: Obtiene contadores de pendientes y resueltos
  - `getInventoryInboxItems(filters)`: Obtiene lista de incidencias con filtros
  - `applyInventoryChange(changeId)`: Aplica un cambio de cantidad
  - `rejectInventoryChange(changeId)`: Rechaza un cambio de cantidad
  - `resolveInventoryReport(reportId, resolution)`: Resuelve un reporte con una resolución específica

### 13.4 Navegación

- `lib/ui/HostBottomNav.tsx`: Navegación inferior móvil (tab "Incidencias")
- `lib/ui/DesktopTopNav.tsx`: Navegación superior desktop (tab "Incidencias")

---

## 14. Checklist de validación (QA)

### 14.1 Casos de prueba básicos

#### Caso 1: Cargar página sin incidencias
- [ ] Cargar `/host/inventory/inbox`
- [ ] Verificar que se muestra tab "Pendientes" por defecto
- [ ] Verificar que se muestra mensaje "No hay pendientes"
- [ ] Verificar que el contador muestra "Pendientes (0)"

#### Caso 2: Cambiar a tab Resueltos
- [ ] Clic en tab "Resueltos"
- [ ] Verificar que la URL incluye `?tab=resolved`
- [ ] Verificar que se muestra mensaje "No hay items resueltos" si está vacío
- [ ] Verificar que el contador muestra "Resueltos (N)"

#### Caso 3: Aplicar filtro por Propiedad
- [ ] Seleccionar una propiedad en el filtro
- [ ] Verificar que la URL incluye `?propertyId=...`
- [ ] Verificar que solo se muestran incidencias de esa propiedad
- [ ] Verificar que los contadores se actualizan según el filtro

#### Caso 4: Aplicar filtro por Tipo
- [ ] Seleccionar "Cambios de cantidad"
- [ ] Verificar que solo se muestran cambios
- [ ] Verificar que el filtro de Severidad NO está visible
- [ ] Seleccionar "Reportes"
- [ ] Verificar que solo se muestran reportes
- [ ] Verificar que el filtro de Severidad SÍ está visible

#### Caso 5: Aplicar filtro por Severidad (solo reportes)
- [ ] Seleccionar tipo "Reportes"
- [ ] Seleccionar severidad "Urgente"
- [ ] Verificar que solo se muestran reportes con severidad URGENT
- [ ] Verificar que los badges de severidad son rojos

#### Caso 6: Aplicar filtro por Fecha
- [ ] Seleccionar "Últimos 7 días"
- [ ] Verificar que solo se muestran incidencias creadas en los últimos 7 días
- [ ] Verificar que la URL incluye `?dateRange=7d`

#### Caso 7: Aprobar cambio de cantidad
- [ ] En tab "Pendientes", encontrar un cambio
- [ ] Clic en "Aceptar y aplicar"
- [ ] Verificar que el cambio desaparece de Pendientes
- [ ] Verificar que aparece en Resueltos
- [ ] Verificar que el contador de Pendientes disminuye
- [ ] Verificar que el contador de Resueltos aumenta
- [ ] Verificar que la cantidad en el inventario se actualizó

#### Caso 8: Rechazar cambio de cantidad
- [ ] En tab "Pendientes", encontrar un cambio
- [ ] Clic en "Rechazar"
- [ ] Verificar que el cambio desaparece de Pendientes
- [ ] Verificar que aparece en Resueltos
- [ ] Verificar que la cantidad en el inventario NO cambió

#### Caso 9: Resolver reporte
- [ ] En tab "Pendientes", encontrar un reporte
- [ ] Clic en "Resolver"
- [ ] Verificar que se abre el modal de resolución
- [ ] Seleccionar una resolución (ej: "Reparar")
- [ ] Clic en "Confirmar"
- [ ] Verificar que el reporte desaparece de Pendientes
- [ ] Verificar que aparece en Resueltos con la resolución mostrada
- [ ] Verificar que el contador de Pendientes disminuye
- [ ] Verificar que el contador de Resueltos aumenta

#### Caso 10: Resolver reporte con remoción de item
- [ ] Resolver un reporte con resolución "Desechar"
- [ ] Verificar que las líneas de inventario del item se desactivan
- [ ] Verificar que el item se archiva si no tiene líneas activas

#### Caso 11: Acciones deshabilitadas en Resueltos
- [ ] Ir a tab "Resueltos"
- [ ] Verificar que NO hay botones de acción visibles en las tarjetas

#### Caso 12: Link a limpieza
- [ ] En una incidencia con `cleaningId`, verificar que existe link "Ver limpieza"
- [ ] Clic en el link
- [ ] Verificar que navega a `/host/cleanings/{cleaningId}`

#### Caso 13: Error al procesar acción
- [ ] Intentar aprobar un cambio que ya fue procesado (simular error)
- [ ] Verificar que se muestra mensaje de error arriba de los tabs
- [ ] Verificar que el mensaje es claro y específico

### 14.2 Verificaciones técnicas

- [ ] Los parámetros de URL se sincronizan correctamente con los filtros
- [ ] Los contadores se calculan correctamente según filtros y tenant
- [ ] Las acciones revalidan las rutas correctas (`/host/inventory/inbox`, `/host/dashboard`)
- [ ] Los estados de carga (`isPending`) deshabilitan correctamente los botones
- [ ] El ordenamiento por fecha descendente funciona correctamente

---

## 15. Referencias

- `prisma/schema.prisma`: Modelos `InventoryReviewItemChange`, `InventoryReport`, `InventoryLine`, `InventoryItem`
- `lib/inventory-i18n.ts`: Funciones de traducción para razones, tipos y severidades de reportes

---

**Versión:** 1.0  
**Fecha:** 2024  
**Mantenedor:** Equipo Hausdame



