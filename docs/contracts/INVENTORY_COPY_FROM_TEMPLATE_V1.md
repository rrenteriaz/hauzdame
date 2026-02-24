# INVENTORY COPY FROM TEMPLATE — V1.0

## Propósito

Este contrato define la funcionalidad de "Crear inventario desde plantilla V1.0", que permite a los usuarios aplicar la plantilla canónica de inventario (`plantillaInventario.v1.0.json`) a una propiedad, reemplazando completamente el inventario existente.

**IMPORTANTE:** Esta funcionalidad sigue el patrón establecido en "Copiar checklist a otras propiedades" (ver `docs/analysis/CHECKLIST_COPY_IMPLEMENTATION.md`).

---

## Alcance

### Plantilla fuente

- **Archivo:** `docs/templates/plantillaInventario.v1.0.json`
- **Versión:** V1.0 (inmutable)
- **Estado:** Congelada oficialmente (ver `docs/contracts/INVENTORY_TEMPLATE_V1.md`)

### Estrategia: OVERWRITE de líneas; InventoryItem es catálogo

**MUST:** Al aplicar la plantilla:
- **Overwrite completo de InventoryLine de la propiedad**: Se eliminan TODAS las `InventoryLine` existentes de la propiedad destino (dentro de transacción atómica)
- **Find-or-create de InventoryItem por tenant**: `InventoryItem` es catálogo compartido por tenant (find-or-create: reutiliza si existe, crea si no existe)
- **Atomicidad real**: Operación atómica (éxito total o rollback total); no se permiten resultados parciales
- Se crea el inventario completo desde la plantilla
- **NO** se hace merge de líneas

**MUST NOT:**
- Hacer merge con inventario existente
- Eliminar `InventoryItem` (es catálogo por tenant, no por propiedad)
- Copiar imágenes asociadas
- Permitir commits parciales o continuar tras errores (si falla cualquier creación, rollback completo)
- Retornar errores parciales (si falla, se lanza error y rollback total)

---

## Flujo UX

### Ubicación del CTA

**Página:** `/host/properties/[id]/inventory`

El botón "Crear inventario desde plantilla" aparece en **dos contextos**:

#### Contexto 1: Cuando hay inventario existente

- Aparece junto a los botones "Agregar item" y "Copiar desde otra propiedad"
- Ubicación: barra de acciones superior (junto al buscador)

#### Contexto 2: Estado vacío

- Aparece en el estado vacío junto a "Agregar item" y "Copiar desde otra propiedad"
- Ubicación: centro de la pantalla, dentro del mensaje de estado vacío

### Visibilidad

- **MUST:** Visible siempre que la propiedad exista
- **MUST NOT:** Deshabilitado solo si la plantilla V1.0 no está disponible (caso raro)

### Modal de confirmación

**Título:** "Crear inventario desde plantilla"

**Descripción (si hay inventario existente):**
```
Esta acción eliminará el inventario actual y lo reemplazará completamente por la plantilla base.
```

**Descripción (si NO hay inventario):**
```
Se creará el inventario completo desde la plantilla base V1.0.
```

**Botones:**
- "Cancelar" (secundario, cierra modal)
- "Crear inventario" (primario, ejecuta acción)

**Estados:**
- Loading: "Creando..." (botón deshabilitado)
- Éxito: Muestra mensaje de éxito y cierra automáticamente después de 2 segundos
- Error: Muestra errores y mantiene modal abierto

---

## Flujo funcional

### Acción disparada

**Click → Modal → Confirmación → Server Action**

1. **Click en "Crear inventario desde plantilla"**
   - Abre modal (`setIsOpen(true)`)
   - Modal muestra advertencia si hay inventario existente

2. **Click en "Crear inventario"**
   - Valida que la propiedad existe
   - Llama a `applyInventoryTemplateToProperty(propertyId)`
   - Muestra estado de carga ("Creando...")
   - Muestra resultado (éxito/errores)
   - Cierra modal automáticamente después de 2 segundos si no hay errores

### Server Action: `applyInventoryTemplateToProperty`

**Archivo:** `app/host/inventory/template-actions.ts`

**Firma:**
```typescript
export async function applyInventoryTemplateToProperty(
  propertyId: string
): Promise<{ created: number; errors: string[] }>
```

**Flujo interno:**

1. **Validación de tenant**
   ```typescript
   const tenant = await getDefaultTenant();
   if (!tenant) throw new Error("No se encontró tenant.");
   ```

2. **Validación de propiedad destino**
   ```typescript
   const property = await prisma.property.findFirst({
     where: { id: propertyId, tenantId: tenant.id },
     select: { id: true },
   });
   if (!property) throw new Error("Propiedad no encontrada.");
   ```

3. **Cargar plantilla V1.0**
   - Leer `docs/templates/plantillaInventario.v1.0.json`
   - Validar formato JSON
   - Validar estructura de items

4. **Crear inventario desde plantilla (transacción atómica)**
   ```typescript
   await prisma.$transaction(async (tx) => {
     // 4.1. OVERWRITE: Eliminar todas las InventoryLine de la propiedad
     await tx.inventoryLine.deleteMany({
       where: {
         propertyId: property.id,
         tenantId: tenant.id,
       },
     });

     // 4.2. Find-or-create InventoryItem (catálogo por tenant)
     // Para cada item en la plantilla:
     //   - Buscar item existente por tenantId + category + nameNormalized + archivedAt: null
     //   - Si existe: reutilizar su id
     //   - Si no existe: crear nuevo item con campos de la plantilla

     // 4.3. Crear InventoryLine para cada línea activa
     //   - Asociar a itemId (del find-or-create)
     //   - Copiar todos los campos de la línea
     //   - Normalizar area y variantValue
     //   - isActive siempre true
   });
   ```
   **NOTA:** `InventoryItem` es catálogo por tenant (no se borra, se reutiliza o crea).

6. **Manejo de errores (modo atómico)**
   - Si ocurre un error durante la aplicación (creación de item o línea), la operación falla completamente
   - Se hace rollback total: NO se realizan cambios en la propiedad (inventario previo se conserva)
   - Se lanza error (throw) con mensaje claro
   - Si éxito: retorna `{ created: number, errors: [] }`

7. **Revalidar path**
   ```typescript
   revalidatePath(`/host/properties/${propertyId}/inventory`);
   ```

### Qué se copia exactamente

**Campos copiados de InventoryItem:**
- ✅ `category` (InventoryCategory)
- ✅ `name` (string, normalizado)
- ✅ `defaultBrand` (string | null)
- ✅ `defaultModel` (string | null)
- ✅ `defaultColor` (string | null)
- ✅ `defaultSize` (string | null)
- ✅ `defaultVariantKey` (string | null)
- ✅ `defaultVariantLabel` (string | null)
- ✅ `defaultVariantOptions` (JSON array | null)

**Campos copiados de InventoryLine:**
- ✅ `area` (string, normalizado)
- ✅ `expectedQty` (number)
- ✅ `condition` (InventoryCondition, default: USED_LT_1Y)
- ✅ `priority` (InventoryPriority, default: MEDIUM)
- ✅ `brand` (string | null)
- ✅ `model` (string | null)
- ✅ `serialNumber` (string | null)
- ✅ `color` (string | null)
- ✅ `size` (string | null)
- ✅ `notes` (string | null)
- ✅ `variantKey` (string | null)
- ✅ `variantValue` (string | null, normalizado)
- ✅ `isActive` (siempre `true`)

**Campos NO copiados:**
- ❌ `id` (se genera nuevo)
- ❌ `propertyId` (se asigna a la propiedad destino)
- ❌ `tenantId` (se asigna al tenant actual)
- ❌ `createdAt` / `updatedAt` (se generan automáticamente)
- ❌ `archivedAt` (siempre `null` para items nuevos)
- ❌ Imágenes asociadas (`InventoryItemAsset`)
- ❌ Campos `frozen*` de la plantilla (metadata, no datos)

### Qué se genera

- **`InventoryItem`** (find-or-create por tenant: reutiliza existentes en el catálogo o crea nuevos)
- **Nuevos `InventoryLine`** para cada línea activa de la plantilla (overwrite completo)
- **Estado:** Todos los items y líneas se crean activos (`archivedAt: null`, `isActive: true`)
- **Atomicidad:** Si cualquier creación falla, rollback total (no se generan cambios parciales)

### Qué NO se copia

- ❌ Líneas con `isActive: false` (solo se copian activas)
- ❌ Imágenes asociadas (`InventoryItemAsset`)
- ❌ Historial de cambios
- ❌ Líneas existentes en destino (se eliminan antes de crear nuevas)

### Qué NO se elimina

- ❌ `InventoryItem` (es catálogo por tenant, no se borra)

---

## Invariantes (NO ROMPER)

### 1. Tenant isolation

**MUST:** NUNCA aplicar plantilla a propiedades de otro tenant.

**Validación:**
- Todas las queries verifican `tenantId`
- La propiedad destino debe pertenecer al tenant actual

### 2. Overwrite completo y atómico

**MUST:** SIEMPRE eliminar todas las líneas antes de crear nuevas (dentro de transacción).

**MUST NOT:** Hacer merge o preservar líneas existentes.

**Atomicidad:**
- Si falla cualquier creación (item o línea), rollback total
- El inventario previo NO se pierde
- No se permiten resultados parciales

### 3. Solo líneas activas

**MUST:** Solo copiar líneas con `isActive: true` de la plantilla.

**MUST NOT:** Copiar líneas inactivas.

### 4. InventoryItem es catálogo (find-or-create por tenant)

**MUST:** Buscar items existentes por `tenantId + category + nameNormalized + archivedAt: null` antes de crear.

**MUST NOT:** Crear items duplicados si ya existe uno con el mismo nombre normalizado en el tenant.

**Comportamiento:**
- `InventoryItem` es catálogo compartido por tenant (no se borra)
- Si el item existe en el catálogo del tenant, reutilizar su `id`
- Si el item no existe, crear nuevo en el catálogo
- No se eliminan `InventoryItem` al aplicar plantilla (solo se eliminan `InventoryLine`)

### 5. Plantilla inmutable

**MUST:** La aplicación COPIA la plantilla, nunca la edita.

**MUST NOT:** Modificar `docs/templates/plantillaInventario.v1.0.json` durante la ejecución.

### 6. Normalización consistente

**MUST:** Usar `normalizeName()` y `normalizeVariantValue()` para todos los campos que lo requieren.

**Campos normalizados:**
- `InventoryItem.name` → `nameNormalized`
- `InventoryLine.area` → `areaNormalized`
- `InventoryLine.variantValue` → `variantValueNormalized`

---

## Errores que se previenen

1. **Aplicar a propiedad de otro tenant**
   - **Prevención:** Validación de `tenantId` en cada query

2. **Crear items duplicados en el catálogo**
   - **Prevención:** Find-or-create por `tenantId + category + nameNormalized + archivedAt: null` antes de crear

3. **Copiar líneas inactivas**
   - **Prevención:** Filtro `line.isActive === true` antes de procesar

4. **Modificar plantilla fuente**
   - **Prevención:** Solo lectura del archivo JSON, nunca escritura

5. **Errores silenciosos o parciales**
   - **Prevención:** Operación atómica; si falla, lanza error (throw) y rollback total
   - No se retornan errores parciales; éxito total o fallo total

6. **Pérdida de datos sin advertencia**
   - **Prevención:** Modal muestra advertencia clara cuando hay inventario existente

---

## Relación con otros contratos

### INVENTORY_TEMPLATE_V1.md

- La plantilla V1.0 es la fuente de datos
- Este contrato define cómo se aplica la plantilla
- La plantilla permanece inmutable

### CHECKLIST_COPY_IMPLEMENTATION.md

- Este feature sigue el mismo patrón que "Copiar checklist"
- Misma estructura de server action
- Mismo manejo de errores
- Mismo patrón de UI (modal, confirmación, feedback)

### PROPERTIES_V1.md

- Este feature se integra en la página de Inventario
- No modifica otros aspectos del módulo de Propiedades

---

## Archivos involucrados

### UI Components

1. **`app/host/properties/[id]/inventory/ApplyTemplateModal.tsx`**
   - Modal de confirmación
   - Maneja estado de carga y errores
   - Cierra automáticamente después de éxito

2. **`app/host/properties/[id]/inventory/page.tsx`**
   - Página SSR de inventario
   - Renderiza botón CTA
   - Pasa `hasExistingInventory` al modal

### Server Actions

1. **`app/host/inventory/template-actions.ts`**
   - `applyInventoryTemplateToProperty()` — función principal
   - Validaciones de tenant y propiedad
   - Lógica de eliminación y creación (transacción atómica)
   - Manejo de errores: rollback total en cualquier fallo

### Helpers reutilizables

- **`getDefaultTenant()`** — obtiene el tenant del usuario actual
- **`normalizeName()`** — normaliza nombres de items y áreas
- **`normalizeVariantValue()`** — normaliza valores de variantes
- **`revalidatePath()`** — Next.js para invalidar cache después de aplicar

---

## Checklist de QA

### Funcionalidad básica

- [ ] El botón "Crear inventario desde plantilla" aparece en estado vacío
- [ ] El botón "Crear inventario desde plantilla" aparece cuando hay inventario
- [ ] El modal muestra advertencia cuando hay inventario existente
- [ ] El modal NO muestra advertencia cuando NO hay inventario
- [ ] Al ejecutar exitosamente, el inventario previo se elimina completamente
- [ ] El nuevo inventario coincide con plantilla V1.0 (91 líneas activas)
- [ ] Los items se deduplican correctamente por `category + nameNormalized` (find-or-create)
- [ ] Si falla cualquier creación, rollback total (inventario previo se conserva)

### Validaciones

- [ ] Tenant isolation garantizado (no cruza tenants)
- [ ] Solo se copian líneas activas (`isActive: true`)
- [ ] No se tocan imágenes (`InventoryItemAsset` no se copia)
- [ ] No se edita la plantilla fuente
- [ ] Normalización aplicada correctamente (`areaNormalized`, `nameNormalized`, `variantValueNormalized`)

### UX

- [ ] El modal cierra automáticamente después de éxito (2 segundos)
- [ ] Los errores se muestran claramente en el modal
- [ ] El botón muestra "Creando..." durante la ejecución
- [ ] El botón se deshabilita durante la ejecución
- [ ] La página se refresca después de éxito

### Performance y atomicidad

- [ ] La transacción asegura atomicidad real (rollback total en cualquier fallo)
- [ ] No hay queries N+1 (find-or-create por tenant)
- [ ] Revalidación de path funciona correctamente
- [ ] Si falla, el inventario previo se conserva (no se pierde)

### Atomicidad

- [ ] Ejecutar dos veces NO crea InventoryItem duplicados (find-or-create)
- [ ] Si falla cualquier creación, rollback total (no hay resultados parciales)
- [ ] El contador `created` refleja solo commits reales (no miente)
- [ ] Si falla, las líneas previas siguen existiendo (no se borraron)

---

## Limitaciones conocidas

1. **No se copian imágenes**
   - Las imágenes son específicas de instancia
   - El usuario debe agregarlas manualmente después

2. **No se preservan líneas existentes**
   - Overwrite completo de `InventoryLine` significa que todas las líneas se reemplazan
   - No hay opción de merge de líneas

3. **InventoryItem es catálogo compartido**
   - `InventoryItem` es catálogo por tenant (no se borra al aplicar plantilla)
   - Se reutiliza si existe en el catálogo, se crea si no existe
   - No se actualizan campos de items existentes para evitar afectar otras propiedades

---

## Referencias

- **Análisis de patrón:** `docs/analysis/CHECKLIST_COPY_IMPLEMENTATION.md`
- **Plantilla canónica:** `docs/contracts/INVENTORY_TEMPLATE_V1.md`
- **Código fuente:**
  - `app/host/inventory/template-actions.ts`
  - `app/host/properties/[id]/inventory/ApplyTemplateModal.tsx`
  - `app/host/properties/[id]/inventory/page.tsx`

---

**Versión del contrato:** 1.0  
**Fecha:** 2025-01-15  
**Estado:** IMPLEMENTADO

