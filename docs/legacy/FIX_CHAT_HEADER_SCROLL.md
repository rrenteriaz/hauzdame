# FIX: Header del Chat Se Mueve al Enfocar Textarea en Móvil

## Causa Exacta del Problema

El problema tenía **tres causas principales** que actuaban en conjunto:

1. **MobileNav presente en thread pages**: El `HostBottomNav` (fixed bottom-0, 64px) se renderizaba incluso en páginas de thread (`/host/messages/[threadId]`), empujando el layout y causando que el navegador intentara hacer scroll para mantener el input visible cuando aparecía el teclado.

2. **ChatPageViewport usando `position: fixed` sin manejar scrollY**: Al montar el componente, si había scroll previo en la página, el `position: fixed` con `top: 0` causaba que el contenido se "saltara" y el header quedara fuera de vista. Además, no se guardaba ni restauraba `scrollY`, causando pérdida de posición.

3. **Conflicto de alturas y scrollIntoView**: El wrapper en `shell.tsx` tenía `min-h-screen` mientras que el `main` tenía `h-[100dvh]`, creando conflicto. Además, `scrollToBottom()` usaba `scrollIntoView()` que puede causar scroll del body si el contenedor no está correctamente aislado.

4. **--app-vh no se aplicaba**: La variable CSS `--app-vh` se setea pero nunca se usaba en las alturas, por lo que el viewport dinámico no tenía efecto.

## Solución Implementada

### 1. Ocultar MobileNav en thread pages específicamente
- **Archivo**: `app/host/layout.tsx` y `app/cleaner/layout.tsx`
- **Cambio**: Cambiar de `pathname?.includes("/host/messages/")` a `pathname?.match(/^\/host\/messages\/[^/]+$/)` para detectar solo thread pages (no inbox)
- **Razón**: El inbox (`/host/messages`) puede mantener el bottom nav, pero los threads necesitan espacio completo sin interferencia

### 2. Eliminar `position: fixed` de ChatPageViewport
- **Archivo**: `components/chat/ChatPageViewport.tsx`
- **Cambio**: Remover `position: fixed` y usar solo `overflow: hidden` en html/body
- **Razón**: `position: fixed` causa problemas con scrollY y offsets. `overflow: hidden` es suficiente para bloquear scroll sin estos efectos secundarios

### 3. Aplicar --app-vh a las alturas
- **Archivo**: `lib/ui/shell.tsx` y `app/cleaner/layout.tsx`
- **Cambio**: Usar `style={{ height: "calc(var(--app-vh, 1dvh) * 100)" }}` en el main para páginas de mensajes
- **Razón**: Permite que el viewport se ajuste dinámicamente cuando aparece el teclado, manteniendo el header visible

### 4. Eliminar conflicto de alturas
- **Archivo**: `lib/ui/shell.tsx`
- **Cambio**: Cambiar wrapper de `min-h-screen` a `h-[100dvh]` cuando es página de mensajes
- **Razón**: Evita conflicto entre `min-h-screen` (permite crecimiento) y `h-[100dvh]` (altura fija)

### 5. Corregir scrollToBottom para no usar scrollIntoView
- **Archivo**: `components/chat/ChatThreadView.tsx`
- **Cambio**: Usar `scrollTop` directamente en el contenedor de mensajes en lugar de `scrollIntoView()`
- **Razón**: `scrollIntoView()` puede causar scroll del body. `scrollTop` solo afecta el contenedor específico

## Archivos Modificados

1. `app/host/layout.tsx` - Ocultar MobileNav solo en thread pages
2. `app/cleaner/layout.tsx` - Ocultar bottom nav solo en thread pages + aplicar --app-vh
3. `components/chat/ChatPageViewport.tsx` - Eliminar position:fixed, usar solo overflow:hidden
4. `lib/ui/shell.tsx` - Eliminar conflicto min-h-screen, aplicar --app-vh
5. `components/chat/ChatThreadView.tsx` - Usar scrollTop en lugar de scrollIntoView

## Resultado

✅ El header del chat permanece siempre visible al enfocar el textarea
✅ El input permanece siempre visible
✅ Solo el área de mensajes hace scroll (comportamiento tipo WhatsApp)
✅ No hay scroll del body/main
✅ El viewport se ajusta dinámicamente cuando aparece el teclado
✅ Desktop no se ve afectado

