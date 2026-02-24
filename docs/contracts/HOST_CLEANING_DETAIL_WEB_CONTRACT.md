# Detalle de Limpieza (Host) — Contrato Web v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Contrato inicial  
**Alcance:** Host Web (desktop, `lg+`)  

**Referencias:**
- `CLEANING_DETAIL_UX_V1.md`: Contrato UX completo del Detalle de Limpieza
- `CLEANING_ASSIGNMENT_V1.md`: Modelo de asignación y niveles conceptuales
- `ASSIGNMENT_COPY_V1.md`: Copy canónico de la tarjeta de asignación
- `HOST_LIMPIEZAS_WEB_CONTRACT.md`: Patrón de wrapper web para páginas Host
- `LAYOUT_BREAKPOINT_GUARDRAILS_V1.md`: Guardrails para cambios web-only

---

## 1. Objetivo

La vista de Detalle de Limpieza del Host (`/host/cleanings/[id]`) muestra información completa de una limpieza específica, con un layout contenido en desktop para mantener consistencia visual con otras páginas del dominio Host.

Debe permitir:
- Visualizar información completa de la limpieza
- Revisar estado de asignación y ejecución
- Realizar acciones sobre la limpieza (asignación manual, cancelación, etc.)
- Mantener consistencia visual con otras páginas Host (layout contenido)

No debe:
- Cambiar comportamiento o lógica de negocio
- Alterar la experiencia móvil
- Modificar la estructura de contenido existente

---

## 2. Diferencia explícita Web vs Mobile

### 2.1 Web (desktop, `lg+`)
- El contenido **NO** es full-width.
- Debe estar **centrado** con un `max-width` (ej. `max-w-6xl`) y aire lateral.
- Se prioriza una sensación de dashboard ejecutivo.

### 2.2 Mobile (sm/md)
- **Debe permanecer idéntico** a la versión actual.
- No se modifican tamaños, paddings ni composición.
- No se introduce contención del contenido.
- **INVARIANTE CRÍTICO:** La UX móvil NO debe alterarse por ajustes web. Todos los cambios visuales deben aplicar SOLO en `lg+`.

---

## 3. Guardrails de breakpoints

**Referencia:** `LAYOUT_BREAKPOINT_GUARDRAILS_V1.md`

**Invariante:** Cualquier ajuste visual web-only debe encapsularse con prefijo `lg:` o usando `HostWebContainer`. Los cambios NO deben afectar mobile.

---

## 4. Layout canónico (Web)

**Regla clave:** En desktop, el contenido del Detalle de Limpieza se renderiza contenido dentro de un wrapper con max-width.

### 4.1 Wrapper canónico

- Aplicar solo en `lg+`
- Clases canónicas:
  - `lg:mx-auto lg:max-w-6xl lg:px-6`

**Resultado esperado:**
```
┌─────────────────────────────────────────┐
│  [Padding lateral en mobile]           │
│  ┌───────────────────────────────────┐ │
│  │  [Contenido centrado en desktop] │ │
│  │  max-width: 72rem (1152px)       │ │
│  │  padding-x: 1.5rem (24px)        │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 4.2 Estructura de la página

El wrapper debe envolver **TODO** el contenido visible de la página:
- Header (`PageHeader`)
- Alerta "Atención requerida" (`CleaningWarningCard`, si aplica)
- Sección "Asignación" (`AssignmentSection`)
- Sección "Info básica"
- Sección "Checklist" (si aplica)
- Sección "Inventario" (si aplica)
- Sección "Acciones" (`CleaningDetailActions`)

**IMPORTANTE:** El wrapper NO debe aplicarse solo a una sección, sino a todo el contenido.

---

## 4. Contenido y comportamiento

### 4.1 Estructura de contenido

La estructura de contenido permanece **idéntica** a la versión anterior:
- Header con título, subtítulo y botón volver
- Alerta de atención requerida (si aplica)
- Sección de asignación
- Información básica de la limpieza
- Checklist (si aplica)
- Inventario (si aplica)
- Acciones disponibles

### 4.2 Comportamiento

- Todas las acciones y navegaciones funcionan igual que antes
- El `returnTo` se preserva correctamente
- Las validaciones y lógica de negocio permanecen intactas

---

## 5. Estado visual: Atención suave en Asignación

### 5.1 Propósito

La tarjeta "Asignación" (`AssignmentSection`) muestra un estado visual de atención suave (amber) cuando la limpieza requiere atención por asignación incompleta, sin cambiar el copy canónico.

**IMPORTANTE:** Este cambio es **SOLO visual** (clases CSS). El copy permanece idéntico al contrato canónico (`ASSIGNMENT_COPY_V1.md`).

### 5.2 Condiciones de activación

El estado visual amber se activa cuando `assignmentLevel` es:
- **Nivel 0:** Sin equipo disponible (`assignmentLevel === 0`)
- **Nivel 1:** Pendiente de aceptación (`assignmentLevel === 1`)
- **Nivel 2:** Asignada a equipo, pero nadie aceptó (`assignmentLevel === 2`)

**Cuando `assignmentLevel >= 3`:** La tarjeta mantiene estilo normal (neutral).

### 5.3 Estilo visual (amber suave)

Cuando está en estado de atención (`assignmentLevel <= 2`):

#### 5.3.1 Contenedor de la tarjeta
- **Borde:** `border-amber-200` o `border-amber-300`
- **Fondo:** `bg-amber-50`

#### 5.3.2 Título "Asignación"
- **Color:** `text-amber-900`
- **Icono:** `⚠️` sutil al lado del título (solo en niveles 0/1/2)

#### 5.3.3 Mensaje principal
- **Color:** `text-amber-900` o `text-amber-800`

#### 5.3.4 Mensaje secundario
- **Color:** `text-amber-800` o `text-amber-700`

### 5.4 Estilo normal (neutral)

Cuando `assignmentLevel >= 3`:
- **Contenedor:** `border-neutral-200 bg-white`
- **Título:** `text-neutral-900`
- **Mensajes:** Colores neutral estándar (`text-neutral-700`, `text-neutral-500`, etc.)

### 5.5 Invariantes

- **INV-VISUAL-1:** El copy NO cambia (sigue `ASSIGNMENT_COPY_V1.md`)
- **INV-VISUAL-2:** Solo cambian clases CSS, no estructura HTML
- **INV-VISUAL-3:** Aplica en mobile y web (no es web-only)
- **INV-VISUAL-4:** No se agregan queries ni cálculos nuevos
- **INV-VISUAL-5:** No se introducen nuevas tarjetas, banners ni tooltips

---

## 6. Navegación

### 6.1 Navegación hacia Detalle de Propiedad

**Desde:** Sección "Info básica" (link a propiedad)

**Ruta:** `/host/properties/[propertyId]?returnTo=/host/cleanings/[cleaningId]?returnTo=...`

**Comportamiento:**
- Preserva contexto completo de la limpieza
- Permite regresar al Detalle de Limpieza desde el Detalle de Propiedad

### 6.2 Navegación hacia Detalle de Reserva

**Desde:** Sección "Info básica" (link a reserva, si existe)

**Ruta:** `/host/reservations/[reservationId]?returnTo=/host/cleanings/[cleaningId]?returnTo=...`

**Comportamiento:**
- Preserva contexto completo de la limpieza
- Permite regresar al Detalle de Limpieza desde el Detalle de Reserva

### 6.3 Navegación de regreso

**Desde:** Botón "Volver" en `PageHeader`

**Ruta:** `returnTo` (validado para rutas `/host` válidas)

**Comportamiento:**
- Preserva contexto de origen (Hoy, Listado, Detalle de Reserva, etc.)
- Valida `returnTo` para evitar open-redirect

---

## 7. Componentes usados

### 7.1 Componentes base
- `PageHeader`: Header con título, subtítulo y botón volver
- `Page`: (no usado directamente, contenido envuelto en div)

### 7.2 Componentes específicos
- `CleaningWarningCard`: Alerta de atención requerida (si aplica)
- `AssignmentSection`: Sección de asignación con estado y acciones
- `CollapsibleChecklist`: Checklist colapsable (si aplica)
- `ChecklistView`: Vista del checklist
- `InventoryCard`: Tarjeta de inventario (si aplica)
- `CleaningDetailActions`: Acciones disponibles sobre la limpieza

---

## 8. Invariantes UX (MUST NOT BREAK)

### 8.1 Layout
- **INV-WEB-1:** En desktop (`lg+`), el contenido está contenido con max-width
- **INV-WEB-2:** En mobile (`sm/md`), el layout permanece idéntico a la versión anterior
- **INV-WEB-3:** El wrapper aplica solo en `lg+`, no afecta mobile

### 8.2 Contenido
- **INV-CONTENT-1:** La estructura de contenido permanece idéntica
- **INV-CONTENT-2:** Todas las secciones se muestran en el mismo orden
- **INV-CONTENT-3:** Las condiciones de visibilidad permanecen iguales

### 8.3 Funcionalidad
- **INV-FUNC-1:** Todas las acciones funcionan igual que antes
- **INV-FUNC-2:** El `returnTo` se preserva correctamente
- **INV-FUNC-3:** Las validaciones y lógica de negocio permanecen intactas

### 8.4 Navegación
- **INV-NAV-1:** La navegación hacia Detalle de Propiedad preserva `returnTo`
- **INV-NAV-2:** La navegación hacia Detalle de Reserva preserva `returnTo`
- **INV-NAV-3:** El botón "Volver" usa `returnTo` validado
- **INV-NAV-4:** No se introducen rutas nuevas

---

## 9. Archivos clave

### 9.1 Implementación
- `app/host/cleanings/[id]/page.tsx`: Página principal del Detalle de Limpieza

### 9.2 Componentes relacionados
- `app/host/cleanings/[id]/CleaningWarningCard.tsx`: Alerta de atención requerida
- `app/host/cleanings/[id]/AssignmentSection.tsx`: Sección de asignación
- `app/host/cleanings/[id]/CleaningDetailActions.tsx`: Acciones disponibles
- `app/host/cleanings/[id]/ChecklistView.tsx`: Vista del checklist
- `app/host/cleanings/[id]/CollapsibleChecklist.tsx`: Checklist colapsable
- `app/host/cleanings/[id]/InventoryCard.tsx`: Tarjeta de inventario

---

## 10. QA Checklist

### 10.1 Layout Web
- [ ] En desktop (`lg+`), el contenido está centrado con max-width
- [ ] El wrapper aplica solo en `lg+` (`lg:mx-auto lg:max-w-6xl lg:px-6`)
- [ ] El contenido no es full-width en desktop

### 10.2 Layout Mobile
- [ ] En mobile (`sm/md`), el layout permanece idéntico a la versión anterior
- [ ] No se introducen cambios visuales en mobile

### 10.3 Contenido
- [ ] Todas las secciones se muestran correctamente
- [ ] Las condiciones de visibilidad funcionan igual que antes
- [ ] El orden de las secciones permanece igual

### 10.4 Funcionalidad
- [ ] Todas las acciones funcionan correctamente
- [ ] El `returnTo` se preserva en todas las navegaciones
- [ ] Las validaciones funcionan igual que antes

### 10.5 Navegación
- [ ] La navegación hacia Detalle de Propiedad preserva `returnTo`
- [ ] La navegación hacia Detalle de Reserva preserva `returnTo`
- [ ] El botón "Volver" funciona correctamente con `returnTo`
- [ ] No se introducen rutas nuevas

---

### 10.6 Estado visual de Asignación
- [ ] En limpieza "Pendiente de aceptación" (nivel 1), la tarjeta muestra fondo amber y borde amber
- [ ] El título "Asignación" muestra icono ⚠️ cuando está en estado de atención
- [ ] Los textos mantienen el copy canónico (verificar literalmente)
- [ ] En limpieza aceptada (nivel 3+), la tarjeta se ve normal (neutral)
- [ ] El comportamiento es idéntico en mobile y web

---

## 11. Notas de implementación

### 11.1 Wrapper
- El wrapper debe envolver TODO el contenido, no solo una sección
- Usar `div` con clases `lg:mx-auto lg:max-w-6xl lg:px-6`
- El contenido interno mantiene su estructura original

### 11.2 Compatibilidad
- Los cambios son puramente de layout (CSS)
- No se modifican componentes existentes
- No se cambia lógica de negocio ni validaciones

---

**Versión:** 1.0  
**Fecha:** 2024  
**Mantenedor:** Equipo Hausdame

