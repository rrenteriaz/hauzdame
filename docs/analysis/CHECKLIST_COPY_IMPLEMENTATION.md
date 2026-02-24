# Análisis: Implementación de "Crear desde Checklist"

**Fecha:** 2025-01-15  
**Propósito:** Documentar cómo está implementada la funcionalidad de "Copiar checklist a otras propiedades" para usarla como referencia al implementar "Crear inventario desde plantilla".

---

## 1. UX — Dónde y cuándo aparece

### Ubicación del CTA

**Archivo:** `app/host/properties/[id]/checklist/ChecklistManager.tsx`

El botón "Copiar a otra propiedad" aparece en **dos contextos diferentes**:

#### Contexto 1: Cuando hay items activos (líneas 458-475)

```tsx
{activeAreas.length > 0 && (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => setIsSelectAreaModalOpen(true)}
      className="flex-1 lg:w-1/4 rounded-lg border border-black bg-black px-3 py-2 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99]"
    >
      Agregar item
    </button>
    <button
      type="button"
      onClick={() => setIsCopyModalOpen(true)}
      className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition active:scale-[0.99]"
    >
      Copiar a otra propiedad
    </button>
  </div>
)}
```

**Características:**
- Aparece junto al botón "Agregar item"
- Solo visible cuando `activeAreas.length > 0` (hay al menos un área con items activos)
- Estilo: botón secundario (borde gris, fondo blanco)
- Ancho: no ocupa todo el espacio (flex, no `flex-1`)

#### Contexto 2: Estado vacío (líneas 478-501)

Cuando **NO hay items activos**, el botón NO aparece. En su lugar, aparece un estado vacío con:
- Mensaje: "Aún no has creado tareas para esta propiedad. Agrega tu primer item o crea una plantilla base para empezar rápido."
- Botón "Agregar item"
- Botón "Crear plantilla base" (diferente funcionalidad)

**Decisión UX:** El botón de copiar solo tiene sentido cuando ya existe contenido para copiar.

### Texto del CTA

- **Botón principal:** "Copiar a otra propiedad"
- **Modal título:** "Copiar checklist a otras propiedades"
- **Modal descripción:** "Selecciona las propiedades a las que quieres copiar este checklist. Se reemplazarán los items existentes."

### Condiciones de visibilidad

- **MUST:** `activeAreas.length > 0` (al menos un área con items activos)
- **MUST NOT:** Aparecer cuando el checklist está vacío

---

## 2. Flujo funcional

### Acción disparada

**Click → Modal → Selección → Server Action**

1. **Click en "Copiar a otra propiedad"**
   - Abre modal (`setIsCopyModalOpen(true)`)
   - Modal muestra lista de propiedades (excluyendo la actual)

2. **Selección de propiedades destino**
   - Checkboxes para cada propiedad
   - Botón "Seleccionar todas" / "Deseleccionar todas"
   - Validación: al menos una propiedad debe estar seleccionada

3. **Click en "Copiar"**
   - Valida que haya al menos una propiedad seleccionada
   - Llama a `copyChecklistToProperties(propertyId, Array.from(selectedProperties))`
   - Muestra estado de carga ("Copiando...")
   - Muestra resultado (éxito/errores)
   - Cierra modal automáticamente después de 2 segundos si no hay errores

### Server Action: `copyChecklistToProperties`

**Archivo:** `app/host/properties/checklist-actions.ts` (líneas 228-317)

**Firma:**
```typescript
export async function copyChecklistToProperties(
  sourcePropertyId: string,
  targetPropertyIds: string[]
): Promise<{ copied: number; errors: string[] }>
```

**Flujo interno:**

1. **Validación de tenant**
   ```typescript
   const tenant = await getDefaultTenant();
   if (!tenant) throw new Error("No se encontró tenant.");
   ```

2. **Validación de propiedad origen**
   ```typescript
   const sourceProperty = await prisma.property.findFirst({
     where: { id: sourcePropertyId, tenantId: tenant.id },
     select: { id: true },
   });
   if (!sourceProperty) {
     throw new Error("Propiedad origen no encontrada.");
   }
   ```

3. **Obtener items del checklist origen**
   ```typescript
   const sourceItems = await (prisma as any).propertyChecklistItem.findMany({
     where: {
       propertyId: sourceProperty.id,
       tenantId: tenant.id,
       isActive: true,  // ⚠️ SOLO items activos
     },
     orderBy: { sortOrder: "asc" },
   });
   ```

   **IMPORTANTE:** Solo copia items con `isActive: true`

4. **Si no hay items, retornar temprano**
   ```typescript
   if (sourceItems.length === 0) {
     return { copied: 0, errors: [] };
   }
   ```

5. **Para cada propiedad destino:**
   - Validar que existe y pertenece al tenant
   - **ELIMINAR todos los items existentes** (líneas 284-290)
     ```typescript
     await (prisma as any).propertyChecklistItem.deleteMany({
       where: {
         propertyId: targetProperty.id,
         tenantId: tenant.id,
       },
     });
     ```
   - **Crear items copiados** (líneas 292-306)
     ```typescript
     for (const item of sourceItems) {
       await (prisma as any).propertyChecklistItem.create({
         data: {
           tenantId: tenant.id,
           propertyId: targetProperty.id,
           area: item.area,
           title: item.title,
           sortOrder: item.sortOrder,
           isActive: true,  // ⚠️ Siempre se crea como activo
           requiresValue: item.requiresValue || false,
           valueLabel: item.valueLabel || null,
         },
       });
     }
     ```
   - Revalidar path de la propiedad destino
   - Incrementar contador `copied`

6. **Manejo de errores**
   - Si una propiedad falla, se registra el error pero se continúa con las demás
   - Retorna `{ copied: number, errors: string[] }`

### Qué se copia exactamente

**Campos copiados:**
- ✅ `area` (ChecklistArea)
- ✅ `title` (string)
- ✅ `sortOrder` (number)
- ✅ `isActive` (siempre `true` en destino)
- ✅ `requiresValue` (boolean, con fallback a `false`)
- ✅ `valueLabel` (string | null)

**Campos NO copiados:**
- ❌ `id` (se genera nuevo)
- ❌ `propertyId` (se asigna a la propiedad destino)
- ❌ `tenantId` (se asigna al tenant actual)
- ❌ `createdAt` / `updatedAt` (se generan automáticamente)

**IMPORTANTE:** No se copian imágenes asociadas a los items. Las imágenes (`ChecklistItemAsset`) NO se copian.

### Qué se genera

- **Nuevos `PropertyChecklistItem`** para cada propiedad destino
- **Estado:** Todos los items se crean con `isActive: true`
- **Orden:** Se mantiene el `sortOrder` del origen

### Qué NO se copia

- ❌ Items con `isActive: false` (solo se copian activos)
- ❌ Imágenes asociadas (`ChecklistItemAsset`)
- ❌ Historial de cambios
- ❌ Items existentes en destino (se eliminan antes de copiar)

---

## 3. Código — Archivos involucrados

### Componentes UI

1. **`app/host/properties/[id]/checklist/ChecklistManager.tsx`**
   - Componente principal que renderiza el checklist
   - Maneja el estado del modal (`isCopyModalOpen`)
   - Maneja la selección de propiedades (`selectedProperties`)
   - Llama a la server action `copyChecklistToProperties`

2. **`app/host/properties/[id]/checklist/page.tsx`**
   - SSR page que obtiene datos iniciales
   - Obtiene lista de propiedades (excluyendo la actual)
   - Pasa `allProperties` como prop a `ChecklistManager`

### Server Actions

1. **`app/host/properties/checklist-actions.ts`**
   - `copyChecklistToProperties()` — función principal de copia
   - Validaciones de tenant y propiedades
   - Lógica de eliminación y creación

### Helpers reutilizables

- **`getDefaultTenant()`** — obtiene el tenant del usuario actual
- **`revalidatePath()`** — Next.js para invalidar cache después de copiar

### Validaciones importantes

1. **Tenant scope**
   - Todas las propiedades (origen y destino) deben pertenecer al mismo tenant
   - Se valida en cada paso

2. **Propiedad origen existe**
   - Si no existe, se lanza error y se detiene el proceso

3. **Propiedades destino existen**
   - Si una propiedad destino no existe, se registra error pero se continúa con las demás

4. **Items activos**
   - Solo se copian items con `isActive: true`

5. **Al menos una propiedad seleccionada**
   - Validación en cliente antes de llamar a la server action

---

## 4. Principios implícitos

### Decisiones UX tomadas

1. **Solo copiar items activos**
   - **Razón:** Los items inactivos son históricos o deprecados
   - **Efecto:** El usuario solo copia lo que realmente necesita

2. **Reemplazar completamente (no merge)**
   - **Razón:** Evita duplicados y confusión
   - **Efecto:** El checklist destino queda idéntico al origen (solo items activos)
   - **Advertencia:** Se muestra claramente en el modal: "Se reemplazarán los items existentes"

3. **Botón solo visible cuando hay contenido**
   - **Razón:** No tiene sentido copiar un checklist vacío
   - **Efecto:** Mejor UX, menos confusión

4. **Manejo de errores parcial**
   - **Razón:** Si una propiedad falla, las demás pueden seguir copiándose
   - **Efecto:** Mejor experiencia, no se pierde todo el trabajo

5. **Cierre automático del modal**
   - **Razón:** Feedback inmediato, no requiere acción adicional
   - **Efecto:** UX más fluida

### Invariantes que no se deben romper

1. **Tenant isolation**
   - NUNCA copiar items de un tenant a otro
   - TODAS las validaciones deben verificar `tenantId`

2. **Solo items activos**
   - NUNCA copiar items con `isActive: false`
   - Esto es un invariante del negocio

3. **Reemplazo completo**
   - NUNCA hacer merge (agregar sin eliminar)
   - SIEMPRE eliminar antes de crear

4. **Orden preservado**
   - El `sortOrder` debe mantenerse exactamente igual
   - Esto asegura que el checklist destino se vea igual al origen

5. **Idempotencia parcial**
   - Si se ejecuta dos veces con los mismos parámetros, el resultado debe ser el mismo
   - (No es completamente idempotente porque genera nuevos IDs, pero el contenido es idéntico)

### Errores que se previnieron

1. **Copiar a la misma propiedad**
   - **Prevención:** La lista `allProperties` excluye la propiedad actual (`id: { not: resolvedParams.id }`)

2. **Copiar items de otro tenant**
   - **Prevención:** Validación de `tenantId` en cada query

3. **Copiar items inactivos**
   - **Prevención:** Query con `isActive: true`

4. **Duplicar items**
   - **Prevención:** Eliminación completa antes de crear nuevos

5. **Errores silenciosos**
   - **Prevención:** Retorno de `errors: string[]` y visualización en UI

---

## 5. Patrón reutilizable para Inventario

### Estructura recomendada

```typescript
// Server Action
export async function copyInventoryFromTemplate(
  propertyId: string,
  templateVersion: string // ej: "v1.0"
): Promise<{ copied: number; errors: string[] }> {
  // 1. Validar tenant
  // 2. Validar propiedad destino
  // 3. Cargar plantilla desde docs/templates/plantillaInventario.v1.0.json
  // 4. Validar que no exista inventario (o preguntar si merge/overwrite)
  // 5. Crear InventoryItem (deduplicar por category + nameNormalized)
  // 6. Crear InventoryLine para cada línea de la plantilla
  // 7. Retornar resultado
}
```

### Diferencias clave con Checklist

1. **Origen:** Checklist copia de otra propiedad, Inventario copia de plantilla estática
2. **Deduplicación:** Inventario debe deduplicar `InventoryItem` por `category + nameNormalized`
3. **Merge vs Overwrite:** Inventario puede necesitar opción de merge (checklist siempre reemplaza)
4. **Cantidades:** Inventario tiene `expectedQty` que puede necesitar lógica especial
5. **Variantes:** Inventario tiene variantes más complejas que checklist

### Componentes UI recomendados

1. **Modal similar** con:
   - Selección de versión de plantilla (si hay múltiples)
   - Opción merge/overwrite
   - Preview de items que se crearán
   - Confirmación antes de ejecutar

2. **Estado vacío** con:
   - Mensaje: "Aún no has creado items para esta propiedad..."
   - Botón "Agregar item"
   - Botón "Crear desde plantilla" (equivalente a "Copiar a otra propiedad")

---

## 6. Checklist de implementación para Inventario

Basado en el análisis de Checklist, al implementar "Crear inventario desde plantilla":

- [ ] Validar tenant en cada paso
- [ ] Cargar plantilla desde archivo estático (`docs/templates/plantillaInventario.v1.0.json`)
- [ ] Validar que la propiedad destino existe y pertenece al tenant
- [ ] Decidir merge vs overwrite (o preguntar al usuario)
- [ ] Deduplicar `InventoryItem` por `category + nameNormalized`
- [ ] Crear `InventoryItem` si no existe
- [ ] Crear `InventoryLine` para cada línea de la plantilla
- [ ] Preservar orden (si aplica)
- [ ] Manejar errores parciales (continuar si un item falla)
- [ ] Retornar `{ copied: number, errors: string[] }`
- [ ] Revalidar path después de copiar
- [ ] Mostrar feedback en UI (éxito/errores)
- [ ] Cerrar modal automáticamente si no hay errores
- [ ] NO copiar imágenes (las imágenes son específicas de instancia)

---

## Referencias

- **Código fuente:**
  - `app/host/properties/[id]/checklist/ChecklistManager.tsx`
  - `app/host/properties/checklist-actions.ts`
  - `app/host/properties/[id]/checklist/page.tsx`

- **Contrato relacionado:**
  - `docs/contracts/PROPERTIES_V1.md` (sección 7.2 "Página Checklist")
  - `docs/contracts/INVENTORY_TEMPLATE_V1.md` (plantilla canónica)

---

**Estado:** Documentación completa para referencia de implementación

