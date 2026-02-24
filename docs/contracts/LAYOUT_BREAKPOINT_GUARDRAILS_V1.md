# Guardrails de Breakpoints — Contrato v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Contrato inicial  
**Alcance:** Todos los ajustes visuales web-only en Host y Cleaner  

**Propósito:** Evitar regresiones en mobile causadas por ajustes visuales para desktop (`lg+`).

---

## 1. Propósito

Este contrato establece reglas inviolables para asegurar que los ajustes visuales destinados a desktop (`lg+`) **NO alteren** la experiencia móvil.

**Principio rector:** Mobile primero. Los cambios web son aditivos y no deben afectar mobile.

---

## 2. Invariantes (MUST NOT BREAK)

### 2.1 Mobile NO debe alterarse por ajustes web

**Regla:** Cualquier cambio visual destinado a desktop debe aplicar **EXCLUSIVAMENTE** en `lg+` usando prefijos Tailwind (`lg:`, `hidden lg:block`, etc.).

**Ejemplos válidos:**
- ✅ `className="lg:mx-auto lg:max-w-6xl lg:px-6"`
- ✅ `className="hidden lg:flex"`
- ✅ `className="block lg:hidden"` (mostrar solo en mobile)

**Ejemplos inválidos:**
- ❌ `className="mx-auto max-w-6xl px-6"` (afecta mobile)
- ❌ `className="flex"` cuando debería ser `hidden lg:flex`

### 2.2 Host mobile NO muestra header superior web

**Regla:** Host mobile usa `HostBottomNav` exclusivamente. El header superior (`DesktopNav`) debe estar oculto en mobile.

**Implementación:**
- Header en `lib/ui/shell.tsx`: `hidden lg:block`
- No introducir headers adicionales visibles en mobile

### 2.3 Cambios web-only SIEMPRE van con prefijo `lg:` o se encapsulan

**Regla:** Todos los ajustes de layout, spacing, y contención para desktop deben:
- Usar prefijo `lg:` en clases Tailwind, O
- Encapsularse en componentes que aplican solo en `lg+`

**Componente recomendado:** `HostWebContainer` (wrapper que aplica solo en `lg+`)

---

## 3. Checklist de PR (copy/paste)

### 3.1 WEB-only classes

- [ ] Todas las clases de layout/containment tienen prefijo `lg:`
- [ ] No hay clases `mx-auto`, `max-w-*`, `px-*` sin prefijo `lg:`
- [ ] Los componentes visibles solo en desktop usan `hidden lg:block` o equivalente
- [ ] Los componentes visibles solo en mobile usan `lg:hidden` o equivalente

### 3.2 Mobile regression (rutas clave)

- [ ] `/host/cleanings` — Sin header superior web, BottomNav visible, layout intacto
- [ ] `/host/cleanings/[id]` — Sin header superior web, layout intacto
- [ ] `/host/reservations/[id]` — Sin header superior web, layout intacto
- [ ] `/host/hoy` — Sin header superior web, BottomNav visible, layout intacto
- [ ] Verificar que no aparezcan barras de navegación superiores en mobile Host

### 3.3 Desktop verification

- [ ] Contenido está centrado con max-width correcto (`max-w-6xl`)
- [ ] Padding lateral aplica correctamente (`px-6`)
- [ ] Header superior visible y funcional
- [ ] Layout consistente con otras páginas web

### 3.4 Performance sanity

- [ ] No se introdujeron hooks/estado extra sin motivo
- [ ] No se agregaron re-renders innecesarios
- [ ] No se duplicaron wrappers innecesariamente
- [ ] Los componentes son server-safe (no client components innecesarios)

---

## 4. Anti-patterns (NO hacer)

### 4.1 Añadir `mx-auto/max-w` sin `lg:`

**❌ Incorrecto:**
```tsx
<div className="mx-auto max-w-6xl px-6">
  {content}
</div>
```

**✅ Correcto:**
```tsx
<div className="lg:mx-auto lg:max-w-6xl lg:px-6">
  {content}
</div>
```

O usar componente encapsulado:
```tsx
<HostWebContainer>
  {content}
</HostWebContainer>
```

### 4.2 Duplicar wrappers en múltiples páginas

**❌ Incorrecto:** Copiar y pegar el mismo wrapper en cada página.

**✅ Correcto:** Usar componente reutilizable `HostWebContainer`.

### 4.3 Usar `router.refresh()` para navegación

**❌ Incorrecto:** Usar `router.refresh()` cuando se puede usar navegación estándar.

**✅ Correcto:** Usar `Link` o `router.push()` con `returnTo` preservado.

### 4.4 Meter header global visible en mobile

**❌ Incorrecto:** Header superior visible en mobile Host.

**✅ Correcto:** Header superior con `hidden lg:block` en `lib/ui/shell.tsx`.

---

## 5. Componente recomendado: `HostWebContainer`

**Archivo:** `lib/ui/HostWebContainer.tsx`

**Propósito:** Encapsular el patrón común de contención web (`lg:mx-auto lg:max-w-6xl lg:px-6`) para evitar duplicación y errores.

**Uso:**
```tsx
import HostWebContainer from "@/lib/ui/HostWebContainer";

export default function MyPage() {
  return (
    <HostWebContainer>
      {/* Contenido */}
    </HostWebContainer>
  );
}
```

**Ventajas:**
- Evita duplicación de código
- Centraliza el patrón de contención
- Reduce errores de copy-paste
- Facilita cambios futuros (si se necesita ajustar max-width, se hace en un solo lugar)

---

## 6. Archivos clave

### 6.1 Layout global
- `lib/ui/shell.tsx`: Header superior con `hidden lg:block`
- `app/host/layout-client.tsx`: BottomNav para mobile

### 6.2 Componentes de contención
- `lib/ui/HostWebContainer.tsx`: Wrapper reutilizable para contención web

### 6.3 Páginas Host (ejemplos)
- `app/host/cleanings/page.tsx`
- `app/host/cleanings/[id]/page.tsx`
- `app/host/reservations/[id]/page.tsx`

---

## 7. QA Checklist (para PR)

### 7.1 Mobile (<lg)
- [ ] `/host/cleanings`: Sin header superior web, BottomNav visible, layout intacto
- [ ] `/host/cleanings/[id]`: Sin header superior web, layout intacto
- [ ] `/host/reservations/[id]`: Sin header superior web, layout intacto
- [ ] `/host/hoy`: Sin header superior web, BottomNav visible, layout intacto

### 7.2 Desktop (lg+)
- [ ] Contenido centrado con max-width correcto
- [ ] Padding lateral aplica correctamente
- [ ] Header superior visible y funcional
- [ ] Layout consistente entre páginas

### 7.3 Performance
- [ ] No se agregaron hooks/estado extra
- [ ] No se introdujeron re-renders innecesarios
- [ ] Componentes son server-safe cuando es posible

---

## 8. Referencias

- `HOST_LIMPIEZAS_WEB_CONTRACT.md`: Contrato específico de Limpiezas (Host)
- `HOST_CLEANING_DETAIL_WEB_CONTRACT.md`: Contrato específico de Detalle de Limpieza (Host)
- `HOST_RESERVATION_DETAIL_WEB_CONTRACT.md`: Contrato específico de Detalle de Reserva (Host)

---

**Versión:** 1.0  
**Fecha:** 2024  
**Mantenedor:** Equipo Hausdame

