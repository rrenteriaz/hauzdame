# Navegación — Contrato v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Contrato inicial  
**Alcance:** Sistema de navegación transversal para módulos Host con back behavior consistente

---

## 1. Propósito y alcance

### 1.1 Qué es Navegación

**Navegación** es el sistema transversal que garantiza comportamiento consistente del botón "Volver" y navegación entre páginas en el scope Host. Define cómo los usuarios regresan a su punto de origen después de navegar hacia páginas hijas o detalles.

### 1.2 Para qué sirve

- **Consistencia:** Asegura que el botón "Volver" siempre regresa al contexto real del usuario.
- **Seguridad:** Previene navegación a rutas no autorizadas mediante validación explícita.
- **UX predecible:** El usuario siempre sabe dónde estará después de hacer click en "Volver".
- **Mantenibilidad:** Centraliza la lógica de navegación en un único helper reutilizable.

### 1.3 Qué problema resuelve

**Problema principal:**
- Sin este sistema, el botón "Volver" puede:
  - No hacer nada (quedarse en la misma página) si el fallback es auto-referencial.
  - Enviar a páginas incorrectas si depende del historial del navegador.
  - Perder contexto en flujos multi-nivel (lista → detalle → subdetalle).

**Por qué NO se debe usar `history.back()` sin fallback:**
- El historial del navegador puede incluir navegación externa o no relacionada.
- No hay garantía de que la página anterior sea la correcta.
- Puede causar loops o navegación inesperada.

**Objetivo UX:**
- Navegación predecible: el usuario siempre sabe dónde estará después de "Volver".
- Sin loops: el botón "Volver" nunca queda en la misma página.
- Contexto preservado: en flujos complejos, siempre se puede regresar al origen real.

### 1.4 Qué NO es

- **NO es un sistema de breadcrumbs:** No muestra ruta completa, solo permite regresar.
- **NO es un sistema de historial:** No depende del historial del navegador.
- **NO es un sistema de permisos:** No valida permisos de acceso, solo rutas permitidas.
- **NO es un sistema de deep linking:** No maneja URLs externas o compartidas.

---

## 2. Principios (MUST)

### 2.1 Reglas obligatorias

**MUST:**
- **Usar helper común `safeReturnTo`:** Todas las páginas Host DEBEN usar `safeReturnTo` desde `@/lib/navigation/safeReturnTo`.
- **Definir fallback explícito y seguro:** Siempre proporcionar un fallback válido que NO sea auto-referencial.
- **Evitar fallback auto-referencial:** El fallback NUNCA debe ser la misma URL actual (causa que "Volver" no navegue).
- **Pasar `returnTo` a sub-links:** Cuando se navega hacia páginas hijas, incluir `?returnTo=${encodeURIComponent(returnTo)}`.
- **Usar `backHref={returnTo}`:** No usar `backHref={returnTo || undefined}` (redundante, el helper siempre retorna string).

**MUST NOT:**
- Crear funciones locales de validación de `returnTo`.
- Usar `router.back()` como mecanismo principal de navegación.
- Hardcodear rutas de regreso sin usar `returnTo` (excepto casos documentados en sección 12).
- Usar fallback auto-referencial (misma URL actual).
- Omitir `returnTo` en navegaciones hacia páginas hijas.

### 2.2 Regla de oro

**El botón "Volver" SIEMPRE regresa a la página origen real del usuario.**

**Ejemplos:**
- Usuario entra desde `/host/properties/[id]` → `/host/properties/[id]/checklist` → Back debe regresar a `/host/properties/[id]` (no a `/host/properties`).
- Usuario entra desde `/host/properties/[id]/history` → `/host/cleanings/[id]` → Back debe regresar a `/host/properties/[id]/history` (no a `/host/cleanings`).

---

## 3. Parámetro returnTo

### 3.1 Definición

**returnTo** es un query parameter que contiene la URL de la página origen desde la cual el usuario navegó hacia la página actual.

**Formato:** `?returnTo=/host/properties/[id]` o `?returnTo=/host/properties/[id]?view=month`

**Características:**
- Puede estar codificado (`encodeURIComponent`) o no.
- Puede contener query params propios de la página origen.
- Debe ser validado antes de usar.

### 3.2 Uso obligatorio

**MUST:**
- Pasar `returnTo` como query param en TODAS las navegaciones hacia páginas hijas.
- Persistir `returnTo` a lo largo del flujo completo (detalle → subpágina → subdetalle).
- Validar `returnTo` antes de usar (nunca confiar en input del usuario sin validar).

**Ejemplos de navegación con returnTo:**
- `/host/properties/[id]` → `/host/properties/[id]/checklist?returnTo=/host/properties/[id]`
- `/host/properties/[id]/history` → `/host/cleanings/[id]?returnTo=/host/properties/[id]/history`
- `/host/properties/[id]` → `/host/reservations/[id]?returnTo=/host/properties/[id]`

**MUST NOT:**
- Omitir `returnTo` en navegaciones hacia páginas hijas.
- Modificar `returnTo` durante el flujo (debe propagarse tal cual).
- Usar `returnTo` sin validar.

---

## 4. Helper común safeReturnTo

### 4.1 Ubicación

**Archivo:** `lib/navigation/safeReturnTo.ts`

**MUST:**
- Todas las páginas del scope Host DEBEN usar este helper para validar `returnTo`.
- Ninguna página debe implementar validación manual de `returnTo`.
- El helper es la única fuente de verdad para validación de rutas de retorno.

**MUST NOT:**
- Crear funciones locales de validación de `returnTo`.
- Validar `returnTo` manualmente con `startsWith` u otras técnicas.
- Bypassear el helper por "casos especiales".

### 4.2 Firma y comportamiento

**Firma esperada:**
```typescript
safeReturnTo(input?: string | null, fallback?: string): string
```

**Parámetros:**
- `input`: String de `returnTo` desde query params (puede estar codificado).
- `fallback`: Ruta de fallback si `input` no es válido (default: `/host/properties`).

**Comportamiento:**
- **Valida rutas internas:** Solo acepta rutas que pertenecen a prefijos permitidos del scope Host.
- **Ignora URLs externas:** Rechaza rutas fuera del scope Host o rutas públicas.
- **Siempre retorna string:** Nunca retorna `null` o `undefined`, siempre retorna un `string` válido.

**Retorna:**
- Ruta validada y decodificada si es válida (con query params preservados).
- `fallback` si `input` es null, undefined, o no es válido.

**Ejemplo de uso:**
```typescript
const returnTo = safeReturnTo(searchParams?.returnTo, "/host/properties");
```

---

## 5. Rutas permitidas

### 5.1 Prefijos actuales

**MUST:**
- El helper valida que `returnTo` pertenezca a uno de estos prefijos:
  - `/host/properties`
  - `/host/workgroups`
  - `/host/cleanings`
  - `/host/reservations`

**MUST NOT:**
- Usar wildcards o patrones dinámicos.
- Permitir rutas fuera del scope Host.
- Permitir rutas públicas o de autenticación.

### 5.2 Expansión del set

**NOTA:**
- El set de prefijos permitidos puede crecer en el futuro.
- Cualquier adición DEBE ser explícita y documentada.
- No se permite expansión automática o basada en patrones.

**Proceso para agregar nuevo prefijo:**
1. Actualizar `allowedPrefixes` en `lib/navigation/safeReturnTo.ts`.
2. Documentar el nuevo prefijo en este contrato.
3. Verificar que no introduce riesgos de seguridad.

---

## 6. Fallback seguro

### 6.1 Regla de fallback

**MUST:**
- Usar fallback que sea una página origen conocida y válida.
- Fallback debe ser específico al contexto cuando sea posible.
- Ejemplos válidos:
  - `/host/properties` (fallback genérico)
  - `/host/properties/[id]` (fallback específico de propiedad)
  - `/host/workgroups` (fallback específico de módulo)

**MUST NOT:**
- Usar `/` como fallback (ruta pública).
- Usar rutas de autenticación como fallback (`/login`, `/auth`).
- Usar rutas externas o absolutas.
- Dejar fallback como `null` o `undefined` (siempre debe ser string válido).

### 6.2 Estrategia de fallback

**Recomendación:**
- Preferir fallback a lista cuando sea posible (evita loops de navegación).
- Ejemplo: En página de checklist (`/host/properties/[id]/checklist`), usar `/host/properties` como fallback (lista), no `/host/properties/[id]` (detalle).
- Fallback específico solo cuando hay contexto claro de origen (ej: desde lista de propiedades, fallback a `/host/properties`).

**MUST NOT:**
- Usar fallback auto-referencial (misma URL actual).
- Ejemplo incorrecto: En `/host/properties/[id]`, usar `/host/properties/[id]` como fallback.
- Ejemplo correcto: En `/host/properties/[id]`, usar `/host/properties` (lista) como fallback.

---

## 7. Casos contractuales obligatorios

### 7.1 Propiedad → Checklist → Back

**Flujo:**
1. Usuario en `/host/properties/[id]`
2. Click en tarjeta "Checklist" → navega a `/host/properties/[id]/checklist?returnTo=/host/properties/[id]`
3. Click en "Volver" → regresa a `/host/properties/[id]`

**MUST:**
- `returnTo` debe ser `/host/properties/[id]` (no `/host/properties`).
- Back debe usar `returnTo` validado.

### 7.2 Propiedad → Historial → Limpieza → Back

**Flujo:**
1. Usuario en `/host/properties/[id]`
2. Click en "Historial de limpiezas" → navega a `/host/properties/[id]/history?returnTo=/host/properties/[id]`
3. Click en limpieza → navega a `/host/cleanings/[id]?returnTo=/host/properties/[id]/history`
4. Click en "Volver" → regresa a `/host/properties/[id]/history` (no a `/host/cleanings`)

**MUST:**
- `returnTo` debe propagarse: `/host/properties/[id]/history` → `/host/cleanings/[id]`.
- Back debe regresar al historial, no a lista genérica de limpiezas.
- El `returnTo` debe incluir la URL completa del historial (con query params si existen).

**Implementación verificable:**
- `app/host/properties/[id]/history/page.tsx`: Link a limpieza incluye `returnTo=${encodeURIComponent(returnTo)}`
- `app/host/cleanings/[id]/page.tsx`: Usa `safeReturnTo(searchParams?.returnTo, fallbackUrl)` y `PageHeader` con `backHref={returnTo}`

### 7.3 Propiedad → Reserva → Back

**Flujo:**
1. Usuario en `/host/properties/[id]`
2. Click en reserva → navega a `/host/reservations/[id]?returnTo=/host/properties/[id]`
3. Click en "Volver" → regresa a `/host/properties/[id]` (no a `/host/reservations`)

**MUST:**
- `returnTo` debe ser `/host/properties/[id]`.
- Back debe regresar a detalle de propiedad, no a lista genérica de reservas.
- El `returnTo` debe propagarse correctamente cuando se navega desde reserva a limpieza.

**Implementación verificable:**
- `app/host/properties/[id]/page.tsx`: Links a reservas incluyen `returnTo=${encodeURIComponent(returnTo)}`
- `app/host/reservations/[id]/page.tsx`: Usa `safeReturnTo(searchParams?.returnTo, "/host/reservations")` y `PageHeader` con `backHref={returnTo}`
- Links desde reserva a limpieza propagan `returnTo` correctamente

### 7.4 Lista → Detalle → Back

**Flujo:**
1. Usuario en `/host/properties` (lista)
2. Click en propiedad → navega a `/host/properties/[id]?returnTo=/host/properties`
3. Click en "Volver" → regresa a `/host/properties` (lista)

**MUST:**
- `returnTo` debe ser la lista origen.
- Back debe regresar a la lista, no a otra página.

**Implementación en lista (construir link):**
```typescript
// En página de lista (app/host/properties/page.tsx)
const buildReturnTo = () => "/host/properties";

// Al construir link a detalle
const detailsHref = `/host/properties/${property.id}?returnTo=${encodeURIComponent(buildReturnTo())}`;
```

**Implementación en detalle (validar y usar):**
```typescript
// En página de detalle (app/host/properties/[id]/page.tsx)
const returnTo = safeReturnTo(
  resolvedSearchParams?.returnTo,
  "/host/properties" // fallback a lista
);

// Usar en Page
<Page showBack backHref={returnTo} />
```

---

## 8. MUST NOT — Anti-patrones

### 8.1 Hardcodear rutas

**MUST NOT:**
- Hardcodear rutas de regreso directamente en componentes.
- Ejemplo incorrecto: `<Link href="/host/properties">Volver</Link>`
- Ejemplo correcto: `<Link href={returnTo}>Volver</Link>`

### 8.2 Usar router.back()

**MUST NOT:**
- Usar `router.back()` como mecanismo principal de navegación.
- Confiar en el historial del navegador para determinar destino.
- Razón: El historial puede incluir navegación externa o no relacionada.

**Excepción documentada:**
- Solo se permite `router.back()` en casos muy específicos donde no hay contexto de origen (ej: entrada directa por URL).

### 8.3 Confiar en history del navegador

**MUST NOT:**
- Asumir que `window.history` contiene la ruta correcta de origen.
- Usar `document.referrer` para determinar destino.
- Depender de cualquier mecanismo del navegador que no sea explícito.

### 8.4 Fallback auto-referencial

**MUST NOT:**
- Usar la misma URL actual como fallback.
- Ejemplo incorrecto: `safeReturnTo(searchParams?.returnTo, `/host/properties/${propertyId}`)` en página `/host/properties/[id]`.
- Ejemplo correcto: `safeReturnTo(searchParams?.returnTo, "/host/properties")` (fallback a lista).

**Razón:** El fallback auto-referencial causa que el botón "Volver" no navegue, quedándose en la misma página.

### 8.5 Funciones locales de validación

**MUST NOT:**
- Crear funciones locales `safeReturnTo` en páginas individuales.
- Implementar validación manual de rutas con `startsWith` o regex.
- Ejemplo incorrecto:
  ```typescript
  function safeReturnTo(from?: string): string {
    if (from && from.startsWith("/host")) {
      return from;
    }
    return "/host/menu";
  }
  ```
- Ejemplo correcto: Usar siempre el helper común desde `@/lib/navigation/safeReturnTo`.

**Razón:** Mantiene consistencia y evita duplicación de lógica.

### 8.6 Omitir returnTo en sub-links

**MUST NOT:**
- Crear links hacia páginas hijas sin incluir `returnTo`.
- Ejemplo incorrecto: `<Link href="/host/properties/[id]/checklist">Checklist</Link>`
- Ejemplo correcto: `<Link href={`/host/properties/${id}/checklist?returnTo=${encodeURIComponent(returnTo)}`}>Checklist</Link>`

**Razón:** Sin `returnTo`, la página hija no puede regresar al origen correcto.

---

## 9. Implementación técnica

### 9.1 Validación de rutas

**Proceso:**
1. Decodificar `returnTo` si está codificado.
2. Extraer ruta base (sin query params) para validar.
3. Verificar que pertenece a prefijo permitido.
4. Retornar ruta completa (con query params) si es válida.
5. Retornar fallback si no es válida.

**MUST:**
- Validación debe ser estricta (no permisiva).
- Decodificación debe ser segura (try-catch).
- Query params deben preservarse en la ruta retornada.

### 9.2 Integración en páginas

**Patrón estándar (Server Component):**
```typescript
import { safeReturnTo } from "@/lib/navigation/safeReturnTo";

export default async function MyPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  
  // Validar returnTo y usar fallback seguro
  // MUST: Fallback siempre a ruta válida, nunca auto-referencial
  const returnTo = safeReturnTo(
    resolvedSearchParams?.returnTo,
    "/host/properties" // fallback específico al contexto
  );

  return (
    <Page showBack backHref={returnTo} title="Mi página">
      {/* contenido */}
    </Page>
  );
}
```

**Patrón estándar (Client Component con useSearchParams):**
```typescript
"use client";
import { useSearchParams } from "next/navigation";
import { safeReturnTo } from "@/lib/navigation/safeReturnTo";

export default function MyClientPage() {
  const searchParams = useSearchParams();
  
  // Validar returnTo y usar fallback seguro
  const returnTo = safeReturnTo(
    searchParams?.get("returnTo") || undefined,
    "/host/properties"
  );

  return (
    <Page showBack backHref={returnTo} title="Mi página">
      {/* contenido */}
    </Page>
  );
}
```

**MUST:**
- Importar helper desde ubicación canónica (`@/lib/navigation/safeReturnTo`).
- Proporcionar fallback apropiado al contexto.
- Usar `returnTo` validado directamente en `backHref` (no `returnTo || undefined`).
- El helper siempre retorna `string`, por lo que `backHref={returnTo}` es suficiente.

**MUST NOT:**
- Usar `backHref={returnTo || undefined}` (redundante).
- Crear funciones locales de validación.
- Validar manualmente con `startsWith` u otras técnicas.

---

## 10. Checklist de QA

### 10.1 Verificaciones obligatorias

**Navegación básica:**
- [ ] Desde lista → detalle → back regresa a lista.
- [ ] Desde detalle → subpágina → back regresa a detalle.
- [ ] Desde subpágina → subdetalle → back regresa a subpágina.

**Casos específicos:**
- [ ] Propiedad → Checklist → Back → Propiedad.
- [ ] Propiedad → Historial → Limpieza → Back → Historial.
- [ ] Propiedad → Reserva → Back → Propiedad.
- [ ] Lista propiedades → Detalle → Back → Lista.

**Seguridad:**
- [ ] Rutas externas son rechazadas por helper.
- [ ] Rutas públicas son rechazadas por helper.
- [ ] Rutas codificadas se decodifican correctamente.
- [ ] Query params se preservan en `returnTo`.

**Consistencia:**
- [ ] Todas las páginas usan helper común (no validación local).
- [ ] Fallback siempre es ruta válida del scope Host.
- [ ] No hay uso de `router.back()` como mecanismo principal.

---

## 11. Round-trip seguro (preservar contexto)

### 11.1 Definición

**Round-trip seguro** significa que cuando un usuario navega a través de múltiples niveles (lista → detalle → subdetalle), el `returnTo` original se conserva en todo el flujo, permitiendo regresar al punto de origen real.

### 11.2 Implementación

**MUST:**
- Al construir `currentViewUrl` para propagar a sub-links, incluir `returnTo` si existe.
- Mantener compatibilidad con parámetros legacy (`from`) cuando aplique.
- Preservar todos los query params relevantes (propertyId, tab, etc.).

**Ejemplo (páginas de Actividad):**
```typescript
// Construir URL de retorno para esta vista (para que los detalles vuelvan aquí)
// Round-trip seguro: conservar returnTo y from si existen
const currentViewParams = new URLSearchParams();
if (propertyId) {
  currentViewParams.set("propertyId", propertyId);
}
if (params?.returnTo) {
  currentViewParams.set("returnTo", params.returnTo);
}
if (params?.from) {
  currentViewParams.set("from", params.from); // compatibilidad legacy
}
const currentViewUrl = `/host/actividad/limpiezas/hoy${currentViewParams.toString() ? `?${currentViewParams.toString()}` : ""}`;

// Usar en links a detalles
const detailHref = `/host/cleanings/${item.id}?returnTo=${encodeURIComponent(currentViewUrl)}`;
```

**Flujo completo paso a paso:**

**Origen:** Usuario en `/host/menu`

**Paso 1:** Click en "Limpiezas de hoy" → navega a:
```
/host/actividad/limpiezas/hoy?returnTo=/host/menu
```

**Paso 2:** Click en una limpieza → navega a:
```
/host/cleanings/123?returnTo=/host/actividad/limpiezas/hoy?returnTo=/host/menu
```
(Nota: `returnTo` contiene la URL completa de actividad con su propio `returnTo` anidado)

**Paso 3:** Click en "Volver" en detalle de limpieza → regresa a:
```
/host/actividad/limpiezas/hoy?returnTo=/host/menu
```
(La página de actividad recibe `returnTo=/host/menu` y lo valida con `safeReturnTo`)

**Paso 4:** Click en "Volver" en actividad → regresa a:
```
/host/menu
```
(Origen original preservado)

**Resultado:** Round-trip completo sin perder contexto.

### 11.3 Compatibilidad legacy

**Uso permitido de `from`:**
- Algunas páginas (especialmente en `/host/actividad/**`) usan `from` como parámetro legacy.
- `from` es equivalente funcional a `returnTo` pero con nombre diferente.

**Prioridad:**
- **MUST:** Leer `returnTo` primero, luego `from` como fallback.
- Ejemplo: `const returnToInput = params?.returnTo || params?.from;`
- Validar con `safeReturnTo(returnToInput, fallback)`.

**Estrategia de migración gradual:**
- **Fase actual:** Leer ambos parámetros para mantener compatibilidad.
- **Al construir `currentViewUrl`:** Incluir ambos si existen (preservar contexto completo).
- **Futuro:** Migrar completamente a `returnTo` y deprecar `from`.

**Ejemplo de implementación:**
```typescript
// Leer ambos (prioridad: returnTo > from)
const returnToInput = params?.returnTo || params?.from;
const returnTo = safeReturnTo(returnToInput, "/host/hoy");

// Construir currentViewUrl preservando ambos
const currentViewParams = new URLSearchParams();
if (params?.returnTo) {
  currentViewParams.set("returnTo", params.returnTo);
}
if (params?.from) {
  currentViewParams.set("from", params.from); // compatibilidad legacy
}
const currentViewUrl = `/host/actividad/limpiezas/hoy${currentViewParams.toString() ? `?${currentViewParams.toString()}` : ""}`;
```

---

## 12. Casos aceptables de hardcode

### 12.1 Páginas raíz de sección

**CUANDO es aceptable hardcodear `backHref`:**

**MUST:**
- Solo en páginas que NO reciben `searchParams` con `returnTo`.
- Solo cuando el origen NO es variable (siempre la misma página).
- Solo en páginas raíz de una sección funcional.

**Ejemplos documentados:**

1. **Páginas de lista sin contexto variable:**
   - `app/host/cleanings/needs-attention/page.tsx`: `backHref="/host/cleanings"` (hardcodeado)
   - Razón: Siempre regresa a lista de limpiezas, no hay origen variable.
   - Estado: ✅ Aceptable

2. **Páginas de lista con filtros pero sin origen variable:**
   - `app/host/cleanings/upcoming/page.tsx`: `backHref="/host/cleanings"` (hardcodeado)
   - Razón: Siempre regresa a lista de limpiezas, filtros no afectan origen.
   - Estado: ✅ Aceptable

3. **Páginas de historial sin origen variable:**
   - `app/host/cleanings/history/page.tsx`: `backHref="/host/cleanings"` (hardcodeado)
   - Razón: Siempre regresa a lista de limpiezas, no hay origen variable.
   - Estado: ✅ Aceptable

**MUST NOT:**
- Hardcodear en páginas que reciben `searchParams` con `returnTo`.
- Hardcodear en páginas de detalle (siempre tienen origen variable).
- Hardcodear en subpáginas (siempre tienen origen variable).

### 12.2 Criterios de aceptabilidad

**Para que un hardcode sea aceptable, DEBE cumplir TODOS:**
1. La página NO recibe `searchParams` con `returnTo`.
2. El origen es siempre el mismo (no hay contexto variable).
3. Es una página raíz de sección (no subpágina ni detalle).
4. El hardcode apunta a una ruta válida del scope Host.

**Si NO cumple todos los criterios:**
- **MUST:** Implementar `returnTo` con `safeReturnTo` y fallback apropiado.

---

## 13. Limitaciones y notas

### 13.1 Rutas permitidas

- **Set actual:** Prefijos explícitos documentados en sección 5.1.
- **Expansión:** Requiere actualización explícita del helper y este contrato.
- **No hay wildcards:** Todas las rutas deben empezar con prefijo permitido.

### 13.2 Query params

- **Preservación:** Query params de `returnTo` se preservan tal cual.
- **No se validan:** Solo se valida el prefijo de la ruta base.
- **Ejemplo:** `/host/properties/[id]?view=month` es válido si `/host/properties/[id]` es válido.

### 13.3 Fallback

- **Default:** `/host/properties` si no se especifica fallback.
- **Recomendación:** Usar fallback específico al contexto cuando sea posible.
- **Nunca:** Usar rutas públicas, externas o de autenticación.
- **Nunca:** Usar fallback auto-referencial (misma URL actual).

### 13.4 Helper siempre retorna string

- **Garantía:** `safeReturnTo` siempre retorna un `string` válido (nunca `null` o `undefined`).
- **Implicación:** No es necesario usar `returnTo || undefined` en `backHref`.
- **Patrón correcto:** `backHref={returnTo}` (directo).

---

## 14. Checklist para PRs

### 14.1 Verificaciones obligatorias antes de merge

**Cada PR que toque navegación DEBE cumplir:**

- [ ] **¿Usa `safeReturnTo`?**
  - Verificar que importa desde `@/lib/navigation/safeReturnTo`.
  - Verificar que NO hay función local de validación.

- [ ] **¿Fallback correcto?**
  - Verificar que el fallback NO es auto-referencial (misma URL actual).
  - Verificar que el fallback es una ruta válida del scope Host.
  - Verificar que el fallback tiene sentido en el contexto.

- [ ] **¿Propaga `returnTo` a sub-links?**
  - Verificar que los links hacia páginas hijas incluyen `?returnTo=${encodeURIComponent(returnTo)}`.
  - Verificar que `returnTo` se propaga en flujos multi-nivel (lista → detalle → subdetalle).

- [ ] **¿Evita loops?**
  - Verificar que el botón "Volver" NO apunta a la misma URL actual.
  - Verificar que el fallback NO causa navegación circular.
  - Probar flujo completo: origen → destino → volver → origen.

- [ ] **¿Mantiene compatibilidad legacy si aplica?**
  - Si la página usa `from` (legacy), verificar que lee ambos: `params?.returnTo || params?.from`.
  - Si construye `currentViewUrl`, verificar que incluye ambos parámetros si existen.

### 14.2 Preguntas de revisión rápida

**Para el revisor:**
1. ¿El código usa `safeReturnTo` del helper común?
2. ¿El fallback es seguro (no auto-referencial)?
3. ¿Los sub-links propagan `returnTo`?
4. ¿El botón "Volver" navega correctamente?
5. ¿Se mantiene compatibilidad legacy si aplica?

**Si alguna respuesta es NO:**
- **MUST:** Solicitar corrección antes de merge.
- **MUST:** Referenciar este contrato (`NAVIGATION_V1.md`).

---

## 15. Referencias cruzadas

### 15.1 Contratos relacionados

- **PROPERTIES_V1.md:** Define navegación específica de propiedades y subpáginas.
- **CLEANER_MEMBERSHIP_V1.md:** Define autenticación y acceso para Cleaners (fuera de alcance de este contrato).

### 15.2 Implementación verificable

**Archivos clave:**
- `lib/navigation/safeReturnTo.ts` — Helper canónico de validación.
- `app/host/properties/[id]/page.tsx` — Ejemplo de detalle con `returnTo`.
- `app/host/properties/[id]/history/page.tsx` — Ejemplo de subpágina con propagación de `returnTo`.
- `app/host/actividad/**/page.tsx` — Ejemplos de round-trip seguro.

---

**Fin del contrato**

