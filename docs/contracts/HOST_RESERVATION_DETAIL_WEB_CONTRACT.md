# Detalle de Reserva (Host) — Contrato Web v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Contrato inicial  
**Alcance:** Host Web (desktop, `lg+`)  

**Referencias:**
- `HOY_HOST_V1.md`: Navegación desde página "Hoy" y listados
- `CLEANING_DETAIL_UX_V1.md`: Navegación hacia Detalle de Limpieza
- `LAYOUT_BREAKPOINT_GUARDRAILS_V1.md`: Guardrails para cambios web-only

---

## 1. Objetivo

La vista de Detalle de Reserva del Host (`/host/reservations/[id]`) muestra información completa de una reserva específica y sus limpiezas asociadas, con un layout contenido en desktop para mantener consistencia visual con otras páginas del dominio Host.

Debe permitir:
- Visualizar información completa de la reserva
- Acceder a detalles de limpiezas asociadas
- Mantener consistencia visual con otras páginas Host (layout contenido)

No debe:
- Cambiar comportamiento o lógica de negocio
- Alterar la experiencia móvil
- Mostrar tarjeta "Atención requerida" (la alerta vive en "Limpiezas asociadas")

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

**Regla clave:** En desktop, el contenido del Detalle de Reserva se renderiza contenido dentro de un wrapper con max-width.

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
- Sección "Info básica"
- Sección "Limpiezas asociadas"
- Sección "Historial" (si aplica)

**IMPORTANTE:** El wrapper NO debe aplicarse solo a una sección, sino a todo el contenido.

---

## 4. Tarjeta "Atención requerida" — Eliminada

### 4.1 Regla canónica

**En Detalle de Reserva (Host), NO existe tarjeta "Atención requerida" en web.**

### 4.2 Justificación

- La alerta de atención requerida para reservas ya está presente en la sección "Limpiezas asociadas".
- Cada limpieza asociada muestra un indicador `⚠️ Atención requerida` cuando `needsAttention === true`.
- No se requiere una tarjeta adicional que duplique esta información.

### 4.3 Comportamiento actual

- La sección "Limpiezas asociadas" muestra:
  - Badge de estado de cada limpieza
  - Indicador `⚠️ Atención requerida` cuando aplica
  - Link hacia Detalle de Limpieza con `returnTo` preservado

**Esto es suficiente y no requiere tarjeta adicional.**

---

## 5. Navegación

### 5.1 Navegación hacia Detalle de Limpieza

**Desde:** Sección "Limpiezas asociadas"

**Ruta:** `/host/cleanings/[cleaningId]?returnTo=/host/reservations/[reservationId]`

**Comportamiento:**
- Preserva contexto completo de la reserva
- Permite regresar al Detalle de Reserva desde el Detalle de Limpieza

### 5.2 Navegación de regreso

**Desde:** Botón "Volver" en `PageHeader`

**Ruta:** `returnTo` (validado para rutas `/host` válidas)

**Comportamiento:**
- Preserva contexto de origen (Hoy, Listado, etc.)
- Valida `returnTo` para evitar open-redirect

---

## 6. Componentes usados

### 6.1 Componentes base
- `PageHeader`: Header con título, subtítulo y botón volver
- `Page`: (no usado directamente, contenido envuelto en div)

### 6.2 Secciones
- Sección "Info básica": Tarjeta con información de la reserva
- Sección "Limpiezas asociadas": Lista de limpiezas con links
- Sección "Historial": Timeline básico (si aplica)

---

## 7. Invariantes UX (MUST NOT BREAK)

### 7.1 Layout
- **INV-WEB-1:** En desktop (`lg+`), el contenido está contenido con max-width
- **INV-WEB-2:** En mobile (`sm/md`), el layout permanece idéntico a la versión anterior
- **INV-WEB-3:** El wrapper aplica solo en `lg+`, no afecta mobile

### 7.2 Contenido
- **INV-CONTENT-1:** NO existe tarjeta "Atención requerida" en Detalle de Reserva
- **INV-CONTENT-2:** La alerta de atención vive en "Limpiezas asociadas"
- **INV-CONTENT-3:** Cada limpieza asociada muestra su propio indicador de atención

### 7.3 Navegación
- **INV-NAV-1:** La navegación hacia Detalle de Limpieza preserva `returnTo`
- **INV-NAV-2:** El botón "Volver" usa `returnTo` validado
- **INV-NAV-3:** No se introducen rutas nuevas

---

## 8. Archivos clave

### 8.1 Implementación
- `app/host/reservations/[id]/page.tsx`: Página principal del Detalle de Reserva

### 8.2 Componentes relacionados
- `app/host/reservations/[id]/WarningCard.tsx`: (NO usado en Detalle de Reserva, solo referencia)

---

## 9. QA Checklist

### 9.1 Layout Web
- [ ] En desktop (`lg+`), el contenido está centrado con max-width
- [ ] El wrapper aplica solo en `lg+` (`lg:mx-auto lg:max-w-6xl lg:px-6`)
- [ ] El contenido no es full-width en desktop

### 9.2 Layout Mobile
- [ ] En mobile (`sm/md`), el layout permanece idéntico a la versión anterior
- [ ] No se introducen cambios visuales en mobile

### 9.3 Contenido
- [ ] NO aparece tarjeta "Atención requerida" en Detalle de Reserva
- [ ] La sección "Limpiezas asociadas" muestra indicadores de atención cuando aplica
- [ ] Cada limpieza asociada muestra su badge de estado y alerta si aplica

### 9.4 Navegación
- [ ] La navegación hacia Detalle de Limpieza preserva `returnTo`
- [ ] El botón "Volver" funciona correctamente con `returnTo`
- [ ] No se introducen rutas nuevas

---

## 10. Notas de implementación

### 10.1 Wrapper
- El wrapper debe envolver TODO el contenido, no solo una sección
- Usar `div` con clases `lg:mx-auto lg:max-w-6xl lg:px-6`
- El contenido interno mantiene su estructura original

### 10.2 Eliminación de WarningCard
- Se eliminó el import de `WarningCard`
- Se eliminó la sección condicional que renderizaba `WarningCard`
- La lógica de `attentionReasons` se mantiene (puede usarse en el futuro si se requiere)

---

**Versión:** 1.0  
**Fecha:** 2024  
**Mantenedor:** Equipo Hausdame

