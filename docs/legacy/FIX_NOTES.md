# FIX: Chat Input No Visible en Móvil + Header Se Mueve con Teclado

## Problema Identificado

### Problema 1: Input no visible sin scroll
El input del chat no era visible en móvil sin hacer scroll. El problema tenía dos causas principales:

### 1. Uso de `h-screen` (100vh) en lugar de `h-[100dvh]` (100dvh)

- **Problema**: `100vh` en móvil incluye el espacio de las barras del navegador del browser (address bar, toolbars), haciendo que el contenido sea más alto que el viewport visible real.
- **Solución**: Cambiar a `h-[100dvh]` que usa el "dynamic viewport height", que se ajusta dinámicamente al viewport visible real, excluyendo las barras del navegador.

### 2. MobileNav (HostBottomNav) tapando el input

- **Problema**: El `HostBottomNav` es `fixed bottom-0` con `h-16` (64px), y se renderizaba incluso en páginas de mensajes, tapando el input del chat.
- **Solución**: Ocultar el `MobileNav` en páginas de mensajes (`/host/messages/[threadId]` y `/cleaner/messages/[threadId]`), ya que el chat tiene su propio header y no necesita la navegación inferior.

## Cambios Implementados

### 1. `lib/ui/shell.tsx`
- Cambiado `h-screen` por `h-[100dvh]` en el `main` para páginas de mensajes
- Agregado `overflow-hidden` y `min-h-0` para prevenir scroll del body
- En desktop mantiene `sm:flex-1 sm:h-auto sm:overflow-visible`

### 2. `app/host/layout.tsx`
- Convertido a componente cliente para usar `usePathname()`
- Agregada lógica para ocultar `MobileNav` cuando `pathname.includes("/host/messages/")`

### 3. `app/cleaner/layout.tsx`
- Agregada lógica para ocultar la navegación inferior cuando `pathname.includes("/cleaner/messages/")`
- Aplicado `h-[100dvh] overflow-hidden min-h-0` al `main` en páginas de mensajes

### Problema 2: Header se mueve al enfocar textarea
Al enfocar el textarea en móvil, el teclado virtual causaba que el navegador hiciera scroll automático para "revelar" el input, empujando el header fuera de la vista.

**Causa**: El body/main tenía scroll habilitado, permitiendo que el navegador hiciera scroll automático cuando aparecía el teclado.

## Solución Implementada

### 1. Bloqueo de scroll del body (`ChatPageViewport`)
- Componente cliente que bloquea el scroll del `html` y `body` en páginas de mensajes
- Usa `position: fixed` en el body para prevenir scroll
- Maneja viewport dinámico con `visualViewport` API cuando está disponible
- Se monta en `app/host/messages/[threadId]/page.tsx` y `app/cleaner/messages/[threadId]/page.tsx`

### 2. Layout con altura fija
- El `main` en `shell.tsx` usa `h-[100dvh]` (dynamic viewport height) en móvil
- `overflow-hidden` previene scroll del contenedor principal
- Solo el área de mensajes (`flex-1 overflow-y-auto`) puede hacer scroll

### 3. Estructura flexbox correcta
- Header: `shrink-0` (altura fija, siempre visible)
- Área de mensajes: `flex-1 min-h-0 overflow-y-auto` (único scroll)
- Input: `shrink-0` (altura fija, siempre visible)

## Resultado

✅ El input del chat es siempre visible sin necesidad de scroll
✅ El header del thread y el input permanecen fijos
✅ Solo la lista de mensajes hace scroll
✅ El input no queda tapado por la bottom nav
✅ No hay scroll del body (documentElement/body scrollTop se mantiene en 0)
✅ **El header NO se mueve al enfocar el textarea** (comportamiento tipo WhatsApp)
✅ El teclado virtual no causa scroll automático del viewport

## Notas Técnicas

- `100dvh` (dynamic viewport height) es una unidad CSS moderna que se ajusta al viewport visible real
- Tailwind no tiene una utilidad `h-dvh` por defecto, por lo que se usa `h-[100dvh]`
- El `overflow-hidden` en el main previene que el body tenga scroll
- El `min-h-0` es necesario para que flexbox funcione correctamente con overflow

