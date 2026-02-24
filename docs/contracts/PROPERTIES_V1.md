# Propiedades — Contrato v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Contrato inicial  
**Alcance:** Gestión de propiedades, checklist, inventario, reservas y limpiezas asociadas

---

## 1. Propósito y alcance

### 1.1 Qué es Propiedades

**Propiedades** es el módulo central para gestionar alojamientos conectados a Hausdame. Permite crear, editar y administrar propiedades, así como gestionar sus recursos asociados: checklist de limpieza, inventario, reservas, limpiezas y grupos de trabajo.

### 1.2 Para qué sirve

- **Gestionar propiedades:** Crear, editar y organizar propiedades por grupos.
- **Configurar checklist:** Definir tareas de limpieza por área para cada propiedad.
- **Gestionar inventario:** Registrar items de inventario por área y categoría.
- **Sincronizar calendarios:** Conectar calendarios iCal de Airbnb para sincronizar reservas.
- **Publicar oportunidades:** Crear anuncios públicos para buscar cleaners (Busco Cleaner).
- **Asignar grupos de trabajo:** Vincular grupos de trabajo a propiedades para gestión de equipos.

### 1.3 Qué NO es

- **NO es un sistema de reservas completo:** Las reservas se sincronizan desde iCal y se muestran como referencia.
- **NO es un sistema de limpiezas completo:** Las limpiezas se gestionan desde el módulo de Limpiezas.
- **NO es un sistema de fotos completo:** Las fotos por tarea de checklist están limitadas a 3 imágenes por tarea (ver sección 7.5).
- **NO es un sistema de geocoding:** La geolocalización usa APIs del navegador y mapas manuales; no se implementa geocoding automático desde dirección.

---

## 2. Rutas principales

### 2.1 Lista de propiedades

**URL:** `/host/properties`

**Título:** "Propiedades"  
**Subtítulo:** "Gestiona aquí tus alojamientos conectados a Hausdame"

**Estructura:**
- Botón "Sincronizar iCal (todas)" en sección "Sincronización masiva" (temporal para testing; objetivo futuro: sincronización automática programada — NO contractual).
- Sección "Tus propiedades" con agrupación por `groupName` (ej: "Centro", "Villas", "Sin grupo").
- Cada grupo muestra tarjetas de propiedades con:
  - Thumbnail (si existe `coverAssetGroupId`)
  - Nombre de la propiedad
  - Alias corto (badge si existe)
  - Dirección (si existe)
  - Estado iCal (conectado/no configurado)
- Click en tarjeta navega a `/host/properties/[id]`.
- Botón "Agregar propiedad" al final.

**MUST:**
- Agrupar propiedades por `groupName` (null/undefined → "Sin grupo").
- Ordenar grupos: "Sin grupo" al final, resto alfabéticamente.
- Ordenar propiedades dentro de grupo por `shortName` ascendente.
- Mostrar link "Propiedades inactivas" si `count(isActive=false) > 0`.

**MUST NOT:**
- Mostrar propiedades con `isActive=false` en la lista principal.

---

### 2.2 Detalle de propiedad

**URL:** `/host/properties/[id]`

**Título:** "Detalle de propiedad"  
**Subtítulo:** NO debe mostrar nombre duplicado (el nombre ya aparece dentro de la tarjeta "Información de la propiedad").

**Orden contractual de tarjetas (de arriba a abajo):**
1. Información de la propiedad
2. Grupos de trabajo asignados
3. Checklist de limpieza
4. Inventario
5. Reservas
6. Busco Cleaner
7. Historial de limpiezas
8. Información adicional

**MUST:**
- Usar `returnTo` query param para navegación de retorno.
- Validar `returnTo` con helper común `safeReturnTo()` de `lib/navigation/safeReturnTo.ts`.
- Helper acepta rutas que empiecen con `/host/properties`, `/host/workgroups`, o `/host/cleanings`.
- Fallback de `returnTo`: ruta específica de la propiedad (ej: `/host/properties/[id]`) si no es válido.
- Mostrar todas las tarjetas en el orden contractual definido.
- Aplicar `max-w-6xl` en web (solo web; móvil full-width).

**MUST NOT:**
- Mostrar subtítulo con nombre de propiedad (duplicado).
- Mostrar tarjeta "Sincronización de calendario" dentro del detalle (solo botón global en lista).

---

## 3. Tarjeta "Información de la propiedad"

### 3.1 Estructura

**Campos mostrados:**
- Nombre (requerido)
- Alias corto (opcional)
- Dirección (opcional)
- Notas (opcional)
- Zona horaria (opcional)
- Hora de check-in (opcional)
- Hora de check-out (opcional)
- Grupo (opcional)
- Email de notificaciones (opcional)
- URL iCal de Airbnb (opcional)
- Acceso y conectividad (sección colapsable si existe al menos uno):
  - Red Wi‑Fi
  - Contraseña Wi‑Fi
  - Clave de acceso
  - Ubicación (lat/lng si existe)

**MUST:**
- Mostrar miniatura de la propiedad (thumbnail de `coverAssetGroupId`) si existe, arriba de los campos.
- Mostrar preview del mapa de ubicación (si existe `latitude` y `longitude`) con layout responsive:
  - WEB (>=lg): mapa al lado de la información textual (grid 2 columnas)
  - MÓVIL: mapa debajo del domicilio/dirección
- El preview del mapa debe ser interactivo mínimo (sin drag/zoom pesado) y mostrar marker en la ubicación exacta.
- En web, "Hora de check-in" y "Hora de check-out" deben mostrarse en la misma fila (sub-grid de 2 columnas).
- Botón "Editar" abre modal `EditPropertyModal`.

**MUST NOT:**
- Mostrar campos vacíos/null.

---

## 4. Modal "Editar propiedad"

### 4.1 Campos del formulario

**Campos requeridos:**
- Nombre de la propiedad (`name`) — REQUIRED
- Alias corto (`shortName`) — REQUIRED

**Campos opcionales:**
- Dirección (`address`) — string combinado con formato "calle, colonia, ciudad, estado, cp"
- Notas (`notes`)
- URL iCal (`icalUrl`)
- Zona horaria (`timeZone`) — selector con zonas IANA
- Hora de check-in (`checkInTime`)
- Hora de check-out (`checkOutTime`)
- Grupo (`groupName`)
- Email de notificaciones (`notificationEmail`)

**Secciones operativas (colapsables):**
- Ubicación: `LocationPicker` con lat/lng
- Conectividad: Wi‑Fi SSID, contraseña, clave de acceso

### 4.2 Zona horaria

**MUST:**
- Mostrar selector con lista común de zonas horarias IANA (subset de zonas más usadas: México, América, Europa, Asia, etc.).
- Default: intentar detectar zona horaria del navegador (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
- Fallback si no se puede detectar: `America/Mexico_City`.
- Si ya existe `timeZone` guardado, usar ese valor como inicial.
- Si la zona detectada no está en la lista común, agregarla al selector o usar fallback.

**MUST NOT:**
- Asumir zona horaria sin intentar detectar.
- Prometer lista completa de todas las zonas IANA del mundo (solo subset común).

**Limitación documentada:**
- Lista IANA: subset común hardcodeado (no lista completa). Si se requiere una zona no incluida, puede agregarse manualmente al código o usar detección automática.

**NOTA (no contractual):**
- La lista de zonas horarias IANA es un subset mantenido manualmente en el código. No es una lista completa de todas las zonas del mundo. Si se requiere agregar nuevas zonas, deben añadirse explícitamente al array `COMMON_TIMEZONES` en `EditPropertyModal.tsx`.

### 4.3 Ubicación

**MUST:**
- Mostrar sección "Ubicación" justo debajo del campo "Dirección" (no dentro de sección colapsable "Ubicación" operativa).
- Permitir capturar latitud/longitud manualmente mediante:
  - Click en mapa (`LocationPicker`)
  - Botón "Usar ubicación actual" (geolocalización del navegador)
  - Botón "Quitar" (si existe ubicación)
  - Opción avanzada "Pegar link de Google Maps" (parseo local sin API)
  - Sección colapsable "Ingresar coordenadas manualmente"
- Si existe dirección capturada y NO hay ubicación guardada, mostrar botón "Ubicar con dirección" (geocoding opt-in).
- El botón "Ubicar con dirección" debe estar visible solo si:
  - Existe dirección (`address` no vacío)
  - NO existe ubicación guardada (`latitude` y `longitude` son null)
- Si el botón no funciona o no hay resultados, mostrar mensaje informativo: "Si el botón no funciona, coloca el pin manualmente en el mapa o usa tu ubicación actual."
- Los inputs de coordenadas manuales deben reflejar siempre el valor actual guardado cuando existe ubicación.

**MUST NOT:**
- Implementar geocoding automático desde dirección (solo opt-in bajo demanda del usuario).
- Bloquear guardado si no hay ubicación.
- Asumir que geocoding siempre funcionará (best-effort, no garantizado).

**Limitación documentada:**
- Geocoding desde dirección: Implementado como funcionalidad opt-in (botón "Ubicar con dirección").
- Usa servicio Nominatim (OpenStreetMap) como best-effort, no garantiza resultados.
- Si el geocoding falla o no encuentra resultados, el usuario debe establecer ubicación manualmente (click en mapa) o usar geolocalización del navegador.
- El botón solo aparece si hay dirección y no hay ubicación guardada.

**NOTA (no contractual):**
- El servicio de geocoding usado (Nominatim/OpenStreetMap) puede no tener todas las direcciones que Google Maps tiene, especialmente en áreas rurales o direcciones muy específicas.
- El sistema intenta mejorar la tasa de éxito para México usando:
  - `countrycodes=mx` para limitar búsqueda a México
  - `accept-language=es` para resultados en español
  - `limit=3` para obtener múltiples resultados y seleccionar el más específico
  - Agregar ", México" al query si no está presente (solo para la llamada, no se persiste)
  - URLSearchParams para construcción de query (sin doble-encoding)
- El sistema intenta normalizar la dirección (remover número interior) y, si falla, reintenta con una versión simplificada (sin código postal).
- Opción "Pegar link de ubicación": permite extraer coordenadas desde URLs de Google Maps sin usar API de pago. Soporta formatos comunes y links cortos (maps.app.goo.gl, goo.gl) mediante resolución server-side de redirects (best-effort, no garantiza que todos los links cortos contengan coordenadas).
- Prioridad de parsing: cuando el URL contiene el patrón !3d<lat>!4d<lng> (pin real del lugar), se usa ese par en vez del centro de cámara (@lat,lng). Si no existe !3d/!4d, se usa @lat,lng como fallback. También soporta /maps?q=lat,lng y /search/?api=1&query=lat,lng.
- Si el geocoding no funciona, el usuario siempre puede usar click/drag en el mapa, geolocalización del navegador, pegar link de ubicación (corto o largo), o ingresar coordenadas manualmente (opción avanzada).
- Las coordenadas manuales persisten en los inputs después de aplicar, y se prefillean automáticamente con las coordenadas actuales cuando se abre la sección o el modal. Los inputs reflejan siempre el valor actual guardado cuando existe ubicación.

### 4.4 Dirección

**MUST:**
- Usar `AddressModal` para capturar dirección en campos estructurados:
  - Calle y número
  - Número interior
  - Colonia
  - Ciudad
  - Estado
  - C.P.
- Guardar como string combinado: `"calle, colonia, ciudad, estado, cp"`.
- Al editar, si existe string combinada, parsear para rellenar campos del modal.

**MUST NOT:**
- Guardar campos estructurados por separado (solo string combinado en `address`).

### 4.5 Animación del modal

**MUST:**
- En móvil: usar `BottomSheet` (desliza desde abajo).
- En web: usar drawer lateral (desliza desde derecha) con overlay.

**MUST NOT:**
- Usar modal centrado en móvil.

---

## 5. Tarjeta "Busco Cleaner"

### 5.1 Ubicación

**MUST:**
- Mostrar después de "Reservas" y antes de "Historial de limpiezas" (orden contractual).

### 5.2 Funcionalidad

**MUST:**
- Mostrar publicaciones existentes (`PropertyOpening`) sin estado "pensando" persistente.
- Cargar datos de openings en el servidor (SSR) y pasarlos como props iniciales al componente cliente.
- Renombrar botón "Crear bandera" → "Publicar anuncio".
- Mostrar estado de opening (Activa, Pausada, Cerrada) con badges.
- Mostrar zona/ciudad y notas si existen.
- Link "Ver solicitudes" si existe opening activa/pausada.

**NOTA (no contractual):**
- La implementación actual usa SSR para cargar openings en `page.tsx` y pasarlos como `initialOpening` al componente `PropertyOpeningManager`, eliminando el estado de carga inicial y mejorando la UX.

**MUST NOT:**
- Mostrar "Cargando..." indefinidamente.
- Usar texto "Crear bandera" (usar "Publicar anuncio").

---

## 6. Tarjeta "Grupos de trabajo asignados"

### 6.1 Estructura

**MUST:**
- Mostrar solo grupos de trabajo asignados (si existen).
- Botón "Asignar grupo de trabajo" o "Cambiar grupo" (si ya hay uno asignado) abre modal:
  - Modal usa `BottomSheet` en móvil y `Drawer/Modal` en desktop (consistente con patrones existentes).
  - Si hay WGs disponibles: selector con opciones (excluir ya asignados) + botón "Asignar" + link "Crear nuevo grupo de trabajo".
  - Si no hay WGs: empty state con mensaje "No hay grupos de trabajo disponibles" + botón "Crear grupo de trabajo" (navega a `/host/workgroups`).
- Botón en web: ancho 1/4 de la tarjeta.
- Botón en móvil: ancho completo.
- Solo mostrar grupos de trabajo con `status: "ACTIVE"` (filtrar INACTIVE).

**MUST NOT:**
- Reinventar backend de grupos de trabajo (solo navegación a página de administración).

---

## 7. Checklist de limpieza

### 7.1 Tarjeta resumen (en detalle de propiedad)

**MUST:**
- Mostrar título: "Checklist de limpieza".
- Cuando hay tareas: mostrar texto descriptivo "Gestiona y revisa el checklist de limpieza de la propiedad." (sin listar áreas ni cantidades).
- Cuando no hay tareas: mostrar estado vacío "Aún no has creado tareas para esta propiedad. Agrega tu primer item o crea una plantilla base para empezar rápido."
- Click en tarjeta navega a `/host/properties/[id]/checklist`.
- Mantener consistencia visual y semántica con la tarjeta "Inventario".

**MUST NOT:**
- Listar áreas que integran el checklist.
- Mostrar cantidades de áreas o tareas en la tarjeta resumen.
- Mostrar texto residual tipo "Plantilla base creada…" cuando no hay tareas.

### 7.2 Página Checklist

**URL:** `/host/properties/[id]/checklist`

**MUST:**
- En web: usar `max-w-6xl` (solo web; móvil full-width).
- Botón superior "Agregar item": solo visible cuando hay al menos 1 tarea activa (`activeAreas.length > 0`).
- Botón superior "Agregar item": ancho 1/4 en web; full en móvil cuando está visible.
- Botón "Copiar a otra propiedad": solo visible cuando hay al menos 1 tarea activa (`activeAreas.length > 0`).
- Estado vacío SIEMPRE: "Aún no has creado tareas para esta propiedad. Agrega tu primer item o crea una plantilla base para empezar rápido."
- Estado vacío incluye botones "Agregar item" y "Crear plantilla base" dentro de la tarjeta de estado vacío.
- Remover cualquier texto residual tipo "Plantilla base creada…" cuando no hay tareas.
- En tarjetas de área, reemplazar "Editar/Eliminar" por iconos (no texto).

**MUST NOT:**
- Mostrar botón superior "Agregar item" cuando el checklist está vacío (sin tareas).
- Mostrar botón "Copiar a otra propiedad" si no hay tareas.

### 7.5 Fotos por tarea de checklist

**MUST:**
- Cada tarea puede tener hasta 3 imágenes.
- Icono de imagen visible siempre junto a cada tarea (en lista principal y en modal de edición de área).
- Badge numérico "n/3" sobre el icono si existen fotos (donde n es el número de fotos actuales).
- Click en icono abre modal "Fotos de la tarea" con 3 slots para gestionar imágenes.
- Modal permite subir, reemplazar o eliminar imágenes por posición (1, 2, 3).
- En listas, mostrar solo thumbnails (256px), no imágenes originales.
- Al subir/reemplazar/eliminar: actualizar estado local sin refresh global ni scroll-to-top.
- Validación cliente y servidor: máximo 5MB por imagen, tipos permitidos: JPG, PNG, WebP.
- Validación servidor: tenant-scope y ownership de la tarea.

**MUST NOT:**
- Permitir más de 3 imágenes por tarea.
- Mostrar imágenes originales en listas (solo thumbnails).
- Borrar archivos del storage al eliminar imagen (solo desvincular relación, igual que inventario).
- Prometer automatismos o procesamiento automático de imágenes.

**NOTA (no contractual):**
- Las imágenes se almacenan en bucket público `checklist-item-images` de Supabase.
- Se generan automáticamente thumbnails de 256px (WebP preferido) además de la imagen original.
- Al eliminar una imagen, solo se desvincula la relación `ChecklistItemAsset`; los registros `Asset` y archivos en storage quedan huérfanos para permitir recuperación si es necesario.

### 7.6 Miniaturas de imágenes en tareas de checklist

**MUST:**
- Las tareas de checklist pueden mostrar una miniatura visual si cuentan con al menos una imagen asociada.
- La miniatura:
  - Se muestra antes de la viñeta (•) para mantener alineación consistente.
  - Es solo de referencia visual (preview).
  - Abre un modal de preview de solo lectura al hacer click/tap.
  - Tamaño discreto: 32px × 32px.
- La gestión de imágenes (agregar, reemplazar, eliminar):
  - Se realiza exclusivamente desde el ícono de imagen con badge (n/3).
  - El preview de la miniatura NO permite edición ni gestión.
- Si una tarea no tiene imágenes:
  - No se muestra miniatura.
  - El slot de 32px permanece vacío pero ocupa espacio para mantener alineación de viñetas.
- El preview modal:
  - Muestra la imagen en grande (solo visualización).
  - Se cierra con botón X, click fuera o tecla Escape.
  - NO permite agregar, editar ni eliminar imágenes.

**MUST NOT:**
- Mostrar miniatura si no hay imágenes.
- Permitir gestión de imágenes desde el preview modal.
- Prometer automatismos o validaciones adicionales basadas en imágenes.

**NOTA (no contractual):**
- Las miniaturas reutilizan los thumbnails obtenidos vía batch SSR para optimizar performance.
- El preview modal usa el mismo thumbnail (no carga imagen original) para mantener consistencia.

---

## 8. Inventario

### 8.1 Tarjeta resumen (en detalle de propiedad)

**MUST:**
- Click en tarjeta navega a `/host/properties/[id]/inventory`.

### 8.2 Página Inventario

**URL:** `/host/properties/[id]/inventory`

**MUST:**
- Estado vacío (cuando no hay items): "Aún no has creado Items para esta propiedad. Agrega tu primer item o copia el inventario desde otra propiedad." + botones "Agregar item" y "Copiar desde otra propiedad".
- Cuando no hay items: ocultar fila de Buscar + Agregar + Copiar (solo mostrar empty-state).
- Cuando ya hay items:
  - En tarjeta del item, icono de imagen SIEMPRE visible (permite agregar/gestionar hasta 3 fotos).
  - Click en icono abre modal `AddItemPhotosModal` para gestionar fotos (agregar desde cero o editar existentes).
  - Eliminar modal de post-creación "¿Agregar fotos ahora o después?".
  - La gestión de fotos será por icono o editar item.

**MUST NOT:**
- Mostrar fila de búsqueda/acciones cuando no hay items.
- Mostrar modal de post-creación de fotos.

---

## 9. Reservas

### 9.1 Tarjeta en detalle de propiedad

**MUST:**
- Mostrar reservas activas hoy y próximas (máximo 10 próximas).
- Solo mostrar reservas con `status = "CONFIRMED"` (excluir BLOCKED).
- Click en reserva navega a `/host/reservations/[id]?returnTo=/host/properties/[id]`.

**MUST:**
- El `returnTo` en detalle de reserva debe regresar a detalle de propiedad (no a `/host/reservations`).

---

## 10. Historial de limpiezas

### 10.1 Tarjeta en detalle de propiedad

**MUST:**
- Mostrar contador de limpiezas si `count > 0`.
- Click navega a `/host/properties/[id]/history?returnTo=/host/properties/[id]`.

### 10.2 Página Historial

**URL:** `/host/properties/[id]/history`

**MUST:**
- En web: usar `max-w-6xl` (solo web; móvil full-width).
- Click en limpieza navega a `/host/cleanings/[id]?returnTo=/host/properties/[id]/history`.
- El `returnTo` en detalle de limpieza debe regresar a historial (no a `/host/cleanings`).

---

## 11. Sincronización de calendario

### 11.1 Botón global

**MUST:**
- Mantener botón "Sincronizar iCal (todas)" en `/host/properties` (sección "Sincronización masiva").
- Documentar objetivo futuro como NO contractual (solo nota): sincronización automática programada.

### 11.2 Tarjeta en detalle

**MUST NOT:**
- Mostrar tarjeta "Sincronización de calendario" dentro del detalle de propiedad.

---

## 12. Navegación y returnTo

### 12.1 Patrón general

**MUST:**
- Back behavior: el botón volver SIEMPRE regresa a la página origen usando `returnTo`.
- Validar `returnTo` con helper común `safeReturnTo()` de `lib/navigation/safeReturnTo.ts` antes de usar.
- Helper debe usarse en todas las páginas del módulo Propiedades para consistencia.
- Pasar `returnTo` como query param en todas las navegaciones hacia páginas hijas.

**NOTA (no contractual):**
- `returnTo` es un patrón transversal definido en `NAVIGATION_V1.md`. Este módulo implementa el patrón pero las reglas generales de navegación están documentadas en el contrato transversal.

**Rutas con returnTo obligatorio:**
- `/host/properties/[id]` → `/host/properties/[id]/checklist?returnTo=...`
- `/host/properties/[id]` → `/host/properties/[id]/inventory?returnTo=...`
- `/host/properties/[id]` → `/host/properties/[id]/history?returnTo=...`
- `/host/properties/[id]` → `/host/reservations/[id]?returnTo=...`
- `/host/properties/[id]/history` → `/host/cleanings/[id]?returnTo=...`

**MUST NOT:**
- Regresar a rutas genéricas (`/host/reservations`, `/host/cleanings`) cuando se viene desde detalle de propiedad.

---

## 13. Ancho en web

### 13.1 Regla general

**MUST:**
- Ancho oficial en web: `max-w-6xl` (solo web; móvil se mantiene full-width).
- Aplicar en:
  - `/host/properties/[id]` (detalle)
  - `/host/properties/[id]/checklist`
  - `/host/properties/[id]/inventory`
  - `/host/properties/[id]/history`

**MUST NOT:**
- Aplicar `max-w-6xl` en móvil (solo web con breakpoint `lg:`).

---

## 14. Checklist de QA

### 14.1 Verificaciones obligatorias

**Ancho web:**
- [ ] Detalle de propiedad usa `max-w-6xl` en web (no móvil).
- [ ] Checklist usa `max-w-6xl` en web (no móvil).
- [ ] Historial usa `max-w-6xl` en web (no móvil).

**Textos:**
- [ ] No hay subtítulo duplicado con nombre en detalle de propiedad.
- [ ] Estado vacío de checklist: texto exacto "Aún no has creado tareas para esta propiedad. Agrega tu primer item o crea una plantilla base para empezar rápido."
- [ ] Estado vacío de inventario: texto exacto "Aún no has creado Items para esta propiedad. Agrega tu primer item o copia el inventario desde otra propiedad."
- [ ] No hay texto residual "Plantilla base creada…" cuando no hay tareas.

**Visibilidad de botones:**
- [ ] Botón superior "Agregar item" en checklist NO visible cuando está vacío (sin tareas).
- [ ] Botón superior "Agregar item" en checklist visible cuando hay tareas (ancho 1/4 en web, full en móvil).
- [ ] Botones de copiar en checklist NO visibles si no hay tareas.
- [ ] Estado vacío muestra botones "Agregar item" y "Crear plantilla base" dentro de la tarjeta.
- [ ] Fila de búsqueda/acciones en inventario oculta cuando no hay items.
- [ ] Botón "Asignar grupo de trabajo": ancho 1/4 en web, full en móvil.

**ReturnTo:**
- [ ] Desde detalle propiedad → reserva → back regresa a detalle propiedad.
- [ ] Desde historial → limpieza → back regresa a historial.
- [ ] Todos los links de navegación incluyen `returnTo` correcto.

**Modal editar:**
- [ ] Alias corto es REQUIRED.
- [ ] Selector de zona horaria con lista común IANA (subset, no completa).
- [ ] Detección automática de zona horaria funciona.
- [ ] Sección Ubicación debajo de Dirección.
- [ ] Mensaje informativo presente cuando hay dirección (no autolocalización).

**Ubicación:**
- [ ] Busco Cleaner aparece después de Información y antes de Historial.
- [ ] Botón "Publicar anuncio" (no "Crear bandera").
- [ ] No hay estado "pensando" persistente.

**Otros:**
- [ ] Tarjeta "Sincronización de calendario" NO aparece en detalle.
- [ ] Iconos en lugar de "Editar/Eliminar" en tarjetas de área del checklist.
- [ ] Miniatura de propiedad en tarjeta Información (si existe).
- [ ] Preview de ubicación en tarjeta Información (si existe).

---

## 15. Limitaciones y notas

### 15.1 Geocoding

- **NO implementado:** Geocoding automático desde dirección a coordenadas.
- **Alternativa:** Usuario establece ubicación manualmente (click en mapa) o usa geolocalización del navegador.
- **Futuro:** Puede implementarse con servicio externo (Google Maps Geocoding API, etc.) si se requiere.

### 15.2 Zona horaria

- **Default:** Intento de detección automática del navegador.
- **Fallback:** `America/Mexico_City` si no se puede detectar.
- **Lista IANA:** Lista común hardcodeada (subset de zonas más usadas: México, América, Europa, Asia, etc.). No es lista completa de todas las zonas IANA del mundo.

### 15.3 Fotos en checklist

- **IMPLEMENTADO:** Cada tarea de checklist puede tener hasta 3 imágenes. Ver sección 7.5 para detalles completos.

### 15.4 Sincronización iCal

- **Estado actual:** Botón manual "Sincronizar iCal (todas)" en lista de propiedades.
- **Objetivo futuro (NO contractual):** Sincronización automática programada.

---

**Fin del contrato**

