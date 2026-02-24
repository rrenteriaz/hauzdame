# Catálogo de Ítems Genéricos — Contrato v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Contrato inicial  
**Alcance:** Catálogo de ítems genéricos como fuente única de verdad para inventario de propiedades

---

## 1. Propósito y alcance

### 1.1 Qué es el Catálogo de Ítems Genéricos

El **Catálogo de Ítems Genéricos** es la fuente única de verdad para los ítems que pueden agregarse al inventario de una propiedad. Define nombres canónicos, genéricos y reutilizables que representan conceptos de inventario sin especificidades de marca, modelo, tamaño, color o material.

### 1.2 Para qué sirve

- **Fuente única de verdad:** Evita duplicados semánticos (ej: "Colchón" vs "colchon" vs "Colchon").
- **Normalización:** Establece nombres canónicos que se reutilizan en múltiples propiedades.
- **Búsqueda y selección:** Permite a los usuarios buscar y seleccionar ítems existentes en lugar de crear duplicados.
- **Consistencia:** Garantiza que el mismo concepto se representa de la misma manera en todo el sistema.

### 1.3 Qué NO es

- **NO es un inventario operativo:** No contiene amenidades, consumibles ni señalización/documentos (ver `OPERATIONAL_CATALOG_V1.md`).
- **NO es una plantilla:** Las plantillas de inventario referencian items del catálogo, pero no lo crean.
- **NO contiene variantes embebidas:** Las variantes (ej: tamaño de cama) se manejan mediante `variantConfig`, no en el nombre.
- **NO contiene especificidades:** No incluye marcas, modelos, tamaños específicos ni materiales hiper específicos en el nombre.

---

## 2. Principios fundamentales

### 2.1 MUST (Obligatorio)

- **MUST:** El catálogo es por tenant (cada tenant tiene su propio catálogo).
- **MUST:** Cada item tiene un nombre canónico único por tenant (independiente de categoría).
- **MUST:** La unicidad se determina por `(tenantId, nameNormalized)`.
- **MUST:** El nombre debe ser genérico y reutilizable (ej: "Colchón", no "Colchón Queen Size").
- **MUST:** La normalización elimina acentos, convierte a minúsculas, hace trim y colapsa espacios.
- **MUST:** Las variantes se definen mediante `variantConfig`, no en el nombre.
- **MUST:** La categoría es clasificación, no identidad del ítem. En V1, cada CatalogItem tiene UNA sola categoría asignada. Si se intenta crear el mismo nameNormalized con otra categoría, se reutiliza el item existente y se conserva su categoría original.
- **MUST:** Los items del catálogo pueden tener múltiples `InventoryLine` asociadas en diferentes propiedades.

### 2.2 MUST NOT (Prohibido)

- **MUST NOT:** Incluir variantes en el nombre (ej: "Colchón Individual" → debe ser "Colchón" con `variantConfig`).
- **MUST NOT:** Incluir marcas en el nombre (ej: "Refrigerador Samsung" → debe ser "Refrigerador").
- **MUST NOT:** Incluir modelos en el nombre (ej: "Cafetera Nespresso Vertuo" → debe ser "Cafetera").
- **MUST NOT:** Incluir tamaños específicos en el nombre (ej: "Mesa de 6 personas" → debe ser "Mesa").
- **MUST NOT:** Incluir materiales específicos en el nombre (ej: "Silla de madera" → debe ser "Silla").
- **MUST NOT:** Crear items duplicados semánticamente (ej: "Colchón" y "colchon").
- **MUST NOT:** Mezclar items de inventario con amenidades o consumibles.

---

## 3. Scope V1

### 3.1 Catálogo por tenant

**REGLA CRÍTICA:** En V1, el catálogo es **por tenant**. Cada tenant tiene su propio catálogo independiente.

**Implicaciones:**
- Un item "Colchón" en Tenant A es diferente de "Colchón" en Tenant B.
- No hay catálogo global compartido entre tenants.
- La unicidad se valida dentro del scope del tenant.

**Futuro (fuera de scope V1):**
- Un catálogo global compartido podría considerarse en versiones futuras.
- Cualquier cambio requeriría una nueva versión del contrato.

### 3.2 Categorías permitidas

El catálogo V1 soporta las siguientes categorías de `InventoryCategory`:

- `FURNITURE_EQUIPMENT` — Muebles y equipamiento
- `LINENS` — Blancos (toallas, sábanas, almohadas, etc.)
- `TABLEWARE_UTENSILS` — Vajilla y utensilios
- `DECOR` — Decoración
- `KITCHEN_ACCESSORIES` — Accesorios de cocina
- `KEYS_ACCESS` — Llaves y acceso
- `OTHER` — Otros (solo para casos excepcionales)

**EXPLÍCITAMENTE EXCLUIDAS:**
- `CONSUMABLES` — Los consumibles pertenecen al Catálogo Operativo (ver `OPERATIONAL_CATALOG_V1.md`).

---

## 4. Modelo conceptual

### 4.1 CatalogItem

Un **CatalogItem** representa un concepto genérico de inventario con las siguientes propiedades:

```typescript
interface CatalogItem {
  id: string;                    // Identificador único
  tenantId: string;              // Tenant propietario (scope V1)
  category: InventoryCategory;  // Categoría del item
  name: string;                  // Nombre canónico (ej: "Colchón")
  nameNormalized: string;        // Nombre normalizado (ej: "colchon")
  
  // Variantes (opcional)
  variantConfig: VariantConfig | null;
  
  // Metadata
  createdAt: DateTime;
  updatedAt: DateTime;
  archivedAt: DateTime | null;   // Soft delete
}
```

### 4.2 VariantConfig

Un **VariantConfig** define variantes permitidas para un item. En V1, solo se soportan variantes de **dominio fuerte y estable**.

#### 4.2.1 Variantes soportadas en V1

**Única variante activa en V1:**
- `bed_size` (tamaño de cama)

**Ejemplo concreto:**
```typescript
{
  variantKey: "bed_size",
  variantLabel: "Tamaño de cama",
  variantOptions: [
    { value: "individual", label: "Individual" },
    { value: "matrimonial", label: "Matrimonial" },
    { value: "queen", label: "Queen" },
    { value: "king", label: "King" }
  ]
}
```

**REGLA:** Si un `CatalogItem` expone `variantConfig`, una `InventoryLine` PUEDE capturar `variantValue` conforme a ese config. Si `variantValue` existe, MUST ser una opción válida. En V1, `bed_size` es la única variante activa; su obligatoriedad puede ser enforced por UX para ítems específicos (ej. Colchón, Sábanas), sin exigir que TODAS las líneas históricas/importadas tengan variante.

**NOTA:** V1 no introduce un flag `required` en `VariantConfig`; si en el futuro se requiere obligatoriedad estricta de dominio, debe definirse en V2.

#### 4.2.2 Variantes candidatas para V2 (NO activas en V1)

Las siguientes variantes **NO están soportadas en V1** y se consideran para versiones futuras:

- `material` (ej: Acero, Plástico, Vidrio, Madera)
- `tipo` (ej: Tipo de mueble, Tipo de utensilio)
- `composición` (ej: Materiales compuestos)

**Razón:** Estas variantes son más débiles y pueden generar inconsistencia. Se postergarán hasta V2 cuando se defina un modelo más robusto.

**Estructura TypeScript:**
```typescript
interface VariantConfig {
  variantKey: string;            // Clave de variante (ej: "bed_size")
  variantLabel: string;          // Etiqueta para UI (ej: "Tamaño de cama")
  variantOptions: VariantOption[]; // Opciones disponibles
}

interface VariantOption {
  value: string;                 // Valor normalizado (ej: "individual")
  label: string;                 // Etiqueta para UI (ej: "Individual")
}
```

### 4.3 Regla de unicidad

**Constraint único:** `(tenantId, nameNormalized)`

**Significado:**
- No puede existir dos items con el mismo `nameNormalized` para el mismo tenant, independientemente de la categoría.
- Ejemplo: No puede haber "Colchón" y "colchon" en el mismo tenant (aunque tengan diferentes categorías).
- **IMPORTANTE:** La categoría es clasificación, no identidad del ítem. Un mismo nombre canónico es único por tenant.

**Validación:**
- Al crear un item, se normaliza el nombre usando `normalizeName()`.
- Se verifica que no exista un item con el mismo `(tenantId, nameNormalized)`.
- Si existe, se reutiliza el item existente (independientemente de su categoría).

### 4.4 Normalización de nombres

**Función `normalizeName(name: string): string`:**

1. **Trim:** Elimina espacios al inicio y final.
2. **Lowercase:** Convierte a minúsculas.
3. **Unicode normalize NFD:** Descompone caracteres con acentos (é → e + ´).
4. **Remove diacritics:** Elimina acentos y diacríticos.
5. **Collapse spaces:** Colapsa múltiples espacios en uno solo.

**Ejemplos:**
- "Colchón" → "colchon"
- "Cafetera  Nespresso" → "cafetera nespresso"
- "Mesa   de   Comedor" → "mesa de comedor"

---

## 5. Relaciones con otros dominios

### 5.1 InventoryLine

**Relación:** `InventoryLine.itemId → CatalogItem.id`

**Significado:**
- Una `InventoryLine` siempre referencia un `CatalogItem`.
- Un `CatalogItem` puede tener múltiples `InventoryLine` en diferentes propiedades.
- Las especificidades (marca, modelo, color, tamaño, variante) se almacenan en `InventoryLine`, no en `CatalogItem`.

**Ejemplo:**
- `CatalogItem`: { name: "Colchón", category: "FURNITURE_EQUIPMENT" }
- `InventoryLine 1`: { itemId: "...", area: "Recámara 1", variantValue: "Matrimonial", brand: "Sealy" }
- `InventoryLine 2`: { itemId: "...", area: "Recámara 2", variantValue: "Individual", brand: "Simmons" }

### 5.2 Plantillas de inventario

**Relación:** Las plantillas **NO crean** items del catálogo.

**Significado:**
- Las plantillas referencian items del catálogo por nombre normalizado.
- Al aplicar una plantilla, se busca o crea el `CatalogItem` correspondiente.
- Si el item no existe en el catálogo, se crea automáticamente.
- Si el item ya existe, se reutiliza.

**Flujo:**
1. Plantilla define: `{ name: "Colchón", category: "FURNITURE_EQUIPMENT" }`
2. Sistema busca: `CatalogItem` con `nameNormalized = "colchon"` (independiente de categoría)
3. Si existe: Reutiliza el `CatalogItem.id` (independientemente de su categoría)
4. Si no existe: Crea nuevo `CatalogItem` con la categoría especificada y luego crea `InventoryLine`

**NOTA:** En V1, aunque la unicidad es por `(tenantId, nameNormalized)`, cada item mantiene una categoría asignada. Si un item existe con diferente categoría, se reutiliza pero se respeta la categoría original del item existente.

---

## 6. Flujo UX conceptual

### 6.1 Seleccionar ítem existente

**Escenario:** Usuario quiere agregar "Colchón" al inventario.

1. Usuario escribe "colchon" en el campo de búsqueda.
2. Sistema busca en el catálogo usando `normalizeName("colchon")`.
3. Sistema encuentra `CatalogItem` con `nameNormalized = "colchon"`.
4. Sistema muestra "Colchón" como resultado.
5. Usuario selecciona "Colchón".
6. Sistema crea `InventoryLine` con `itemId` del `CatalogItem` seleccionado.

### 6.2 Crear nuevo ítem si no existe

**Escenario:** Usuario quiere agregar "Congelador" pero no existe en el catálogo.

1. Usuario escribe "congelador" en el campo de búsqueda.
2. Sistema busca en el catálogo usando `normalizeName("congelador")`.
3. Sistema no encuentra ningún `CatalogItem` con ese nombre.
4. Sistema muestra opción "Crear 'Congelador'".
5. Usuario selecciona "Crear 'Congelador'".
6. Sistema crea nuevo `CatalogItem`:
   - `name = "Congelador"`
   - `nameNormalized = normalizeName("Congelador") = "congelador"`
   - `category = inferCategory("Congelador")` (o categoría seleccionada por usuario)
7. Sistema crea `InventoryLine` con `itemId` del nuevo `CatalogItem`.

**REGLA:** El nombre ingresado por el usuario se preserva exactamente (con mayúsculas/minúsculas) en `name`, pero se normaliza para `nameNormalized`.

---

## 7. Invariantes del dominio

### 7.1 Invariantes críticos

1. **Unicidad por normalización:**
   - No puede existir dos `CatalogItem` con el mismo `(tenantId, nameNormalized)`.
   - Si se intenta crear un duplicado, se debe reutilizar el existente (independientemente de la categoría).
   - **IMPORTANTE:** La categoría es clasificación, no identidad del ítem.

2. **Nombre canónico:**
   - El `name` debe ser genérico y reutilizable.
   - No debe contener variantes, marcas, modelos ni especificidades.

3. **Normalización consistente:**
   - `nameNormalized` siempre se calcula usando `normalizeName(name)`.
   - La normalización es idempotente: `normalizeName(normalizeName(x)) === normalizeName(x)`.

4. **Variantes mediante config:**
   - Si un item tiene variantes, deben definirse en `variantConfig`.
   - Las variantes NO deben estar embebidas en el nombre.
   - En V1, solo se soporta la variante `bed_size` (tamaño de cama).
   - Otras variantes (material, tipo, composición) se postergarán a V2.

5. **Scope por tenant:**
   - En V1, el catálogo es por tenant.
   - No hay catálogo global compartido.

### 7.2 Invariantes de integridad

1. **Referencias válidas:**
   - Toda `InventoryLine` debe referenciar un `CatalogItem` existente.
   - Si se archiva un `CatalogItem`, las `InventoryLine` asociadas pueden seguir existiendo (soft delete).

2. **Categorías válidas:**
   - `category` debe ser uno de los valores permitidos de `InventoryCategory`.
   - `CONSUMABLES` está explícitamente excluido del catálogo V1.

---

## 8. Checklist de validación PR / QA

### 8.1 Creación de items

- [ ] El nombre es genérico (sin variantes, marcas, modelos, tamaños específicos).
- [ ] El `nameNormalized` se calcula correctamente usando `normalizeName()`.
- [ ] Se valida unicidad por `(tenantId, nameNormalized)` (independiente de categoría).
- [ ] Si existe un item con el mismo `nameNormalized`, se reutiliza en lugar de crear duplicado (independientemente de la categoría).
- [ ] El `name` preserva el casing exacto ingresado por el usuario.

### 8.2 Búsqueda y selección

- [ ] La búsqueda usa `normalizeName()` en ambos lados (término de búsqueda e items).
- [ ] "colchon" encuentra "Colchón" (sin acentos).
- [ ] "Colchón" encuentra "colchon" (case-insensitive con normalización).
- [ ] No aparecen duplicados en los resultados de búsqueda.

### 8.3 Variantes

- [ ] Si un item tiene `variantConfig`, las `InventoryLine` PUEDEN capturar `variantValue` conforme a ese config.
- [ ] Si `variantValue` existe, MUST ser una opción válida del `variantConfig`.
- [ ] Las variantes NO están embebidas en el nombre del item.
- [ ] El `variantConfig` define opciones válidas y normalizadas.
- [ ] En V1, solo se usa la variante `bed_size` (tamaño de cama).
- [ ] No se usan variantes de material, tipo o composición en V1.
- [ ] La obligatoriedad de variante puede ser enforced por UX para ítems específicos, sin exigir variante para todas las líneas históricas/importadas.

### 8.4 Integración con plantillas

- [ ] Las plantillas referencian items por nombre normalizado.
- [ ] Al aplicar una plantilla, se busca o crea el `CatalogItem` correspondiente.
- [ ] Si el item no existe, se crea automáticamente.
- [ ] Si el item ya existe, se reutiliza.

### 8.5 Scope por tenant

- [ ] El catálogo es por tenant (no global).
- [ ] La unicidad se valida dentro del scope del tenant.
- [ ] Items del mismo nombre en diferentes tenants son independientes.

---

## 9. Restricciones y limitaciones

### 9.1 V1 NO incluye

- **Catálogo global:** El catálogo es por tenant, no compartido.
- **Consumibles:** Los consumibles pertenecen al Catálogo Operativo.
- **Amenidades:** Las amenidades pertenecen al Catálogo Operativo.
- **Señalización/Documentos:** Pertenecen al Catálogo Operativo.
- **Variantes complejas:** Solo se soporta la variante `bed_size` (tamaño de cama) en V1.
- **Variantes de material/tipo:** Variantes como `material`, `tipo`, `composición` se postergarán a V2.
- **UI específica:** Este contrato no define UI, solo dominio.

### 9.2 Decisiones explícitas

- **Unicidad independiente de categoría:** La unicidad se determina por `(tenantId, nameNormalized)`, no por categoría. La categoría es clasificación, no identidad.
- **Normalización sin acentos:** Se eliminan acentos para evitar duplicados semánticos.
- **Preservación de casing:** El `name` preserva el casing original para display.
- **Soft delete:** Los items se archivan (`archivedAt`), no se eliminan físicamente.
- **Find-or-create:** Al aplicar plantillas, se busca o crea automáticamente.
- **Variantes limitadas a V1:** Solo `bed_size` está activa en V1. Otras variantes se postergarán a V2.
- **Cama como CatalogItem genérico:** "Cama" es un CatalogItem genérico. El tamaño se maneja mediante la variante `bed_size`. No deben existir CatalogItems como "Cama Queen", "Cama King", etc.

---

## 10. Referencias cruzadas

- **Plantillas de inventario:** `docs/contracts/INVENTORY_TEMPLATE_V1.md`
- **Catálogo Operativo:** `docs/contracts/OPERATIONAL_CATALOG_V1.md`
- **Aplicar plantilla:** `docs/contracts/INVENTORY_COPY_FROM_TEMPLATE_V1.md`

---

**Versión del contrato:** 1.0  
**Fecha de creación:** YYYY-MM-DD  
**Estado:** Canonical

