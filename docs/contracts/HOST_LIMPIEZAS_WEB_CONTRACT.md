# Limpiezas (Host) — Contrato Web v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Contrato inicial  
**Alcance:** Host Web (desktop, `lg+`)  

**Referencias:**
- `LAYOUT_BREAKPOINT_GUARDRAILS_V1.md`: Guardrails para cambios web-only

---

## 1. Objetivo

La vista de Limpiezas del Host (`/host/cleanings`) ofrece una visión ejecutiva del calendario y del estado de limpiezas, **sin convertirse en una vista operativa** de asignación.

Debe permitir:
- Visualizar el calendario de limpiezas con contexto suficiente para tomar decisiones
- Acceder a detalles de limpiezas próximas
- Mantener consistencia visual con Services (ritmo, densidad, composición)

No debe:
- Reutilizar patrones visuales del dominio Cleaner (cards operativas)
- Cambiar comportamiento o lógica de negocio
- Alterar la experiencia móvil

---

## 2. Diferencia explícita Web vs Mobile

### 2.1 Web (desktop, `lg+`)
- El calendario **NO** es full-width.
- Debe estar **centrado** con un `max-width` (ej. `max-w-6xl`) y aire lateral.
- Se prioriza una sensación de dashboard ejecutivo.

### 2.2 Mobile (sm/md)
- **Debe permanecer idéntico** a la versión actual.
- No se modifican tamaños, paddings ni composición.
- No se introduce contención del calendario.
- **INVARIANTE CRÍTICO:** La UX móvil NO debe alterarse por ajustes web. Todos los cambios visuales deben aplicar SOLO en `lg+`.

---

## 3. Guardrails de breakpoints

**Referencia:** `LAYOUT_BREAKPOINT_GUARDRAILS_V1.md`

**Invariante:** Cualquier ajuste visual web-only debe encapsularse con prefijo `lg:` o usando `HostWebContainer`. Los cambios NO deben afectar mobile.

---

## 4. Layout canónico del calendario (Web)

**Regla clave:** En desktop, el calendario del Host se renderiza contenido dentro de un wrapper con max-width.

### 4.1 Wrapper canónico

- Aplicar solo en `lg+`
- Clases recomendadas (ejemplo canónico):
  - `lg:mx-auto lg:max-w-6xl lg:px-6`

**Resultado esperado:**
```
|                max-width                |
|       [ Calendario centrado ]           |
|        (aire visual lateral)            |
```

---

## 4. Cards permitidas en Host Web

### 4.1 Cards visibles (Host Web)

**Solo dos cards permitidas:**
- **“Próximas limpiezas”**
- **“Historial de limpiezas”**

**En web (lg+), los rows inferiores de texto quedan ocultos:**
- “Próximas limpiezas (N)”
- “Historial de limpiezas (N)”

### 4.3 Navegación de las cards (invariante funcional)

Las cards en Host Web navegan a **páginas dedicadas** (no scroll a secciones embebidas).

- **"Próximas limpiezas"** → `/host/cleanings/upcoming?month=YYYY-MM&date=YYYY-MM-DD&view=<view>`
  - Página dedicada que muestra la lista completa de limpiezas próximas
  - Preserva parámetros de navegación (month, date, view) para mantener contexto
  - NO debe existir sección embebida "Próximas limpiezas" en `/host/cleanings` en desktop (lg+)

- **"Historial de limpiezas"** → `/host/cleanings/history`
  - Página dedicada existente con filtros y agrupación por mes

**Regla crítica:** 
- Las cards son **reemplazos visuales** de los links textuales que existían en mobile
- En desktop (lg+), NO debe existir sección embebida "Próximas limpiezas" debajo del calendario
- La navegación debe ser a páginas dedicadas, no a anchors/hash dentro de la misma página

### 4.2 Cards prohibidas (Host Web)

No deben mostrarse:
- “Mis limpiezas”
- “Disponibles”

**Nota:** Estos conceptos son propios del dominio Cleaner/Services y no deben aparecer en Host Web.

---

## 5. Invariantes visuales (MUST NOT BREAK)

- El calendario en Host Web **nunca** es full-width en desktop.
- En móvil no se altera la estructura ni la densidad actual.
- La vista de Host no debe sentirse “operativa”; debe conservar un tono ejecutivo.
- No se reutilizan tarjetas/containers de Cleaner para Host.

---

## 6. Archivos clave involucrados

### 6.1 Página principal
- `app/host/cleanings/page.tsx`

### 6.2 Páginas dedicadas
- `app/host/cleanings/upcoming/page.tsx` — Página dedicada de próximas limpiezas (web-first)
- `app/host/cleanings/history/page.tsx` — Página dedicada de historial

### 6.3 Shell del calendario
- `app/host/cleanings/CleaningsViewShell.tsx`

### 6.4 Componentes de calendario
- `MonthlyCleaningsCalendar` (definido en `app/host/cleanings/page.tsx`)
- `WeeklyCleaningsView` (definido en `app/host/cleanings/page.tsx`)
- `DailyCleaningsViewWithModal` (archivo dedicado)

---

## 7. Criterios de aceptación (QA)

- En desktop, el calendario está centrado y contenido (no full-width).
- En mobile, el layout se mantiene sin cambios visuales.
- En Host Web solo aparecen las cards "Próximas limpiezas" y "Historial de limpiezas".
- En web (lg+) no se muestran los rows inferiores de próximas/historial.
- En desktop (lg+), NO existe sección embebida "Próximas limpiezas" debajo del calendario.
- Click en card "Próximas limpiezas" abre página dedicada `/host/cleanings/upcoming` (no scroll a sección).
- Click en card "Historial de limpiezas" abre página dedicada `/host/cleanings/history`.
- "Mis limpiezas" y "Disponibles" no se muestran en Host.
- No se rompe ninguna funcionalidad existente.

---

**Fin del contrato**

