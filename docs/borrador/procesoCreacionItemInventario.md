# Proceso Completo de Creación de Item de Inventario

**Fecha:** 2025-01-XX  
**Versión:** 1.0  
**Ejemplo:** Sofá Modular de 3 Piezas con Variantes

---

## 📋 Resumen Ejecutivo

Este documento describe el proceso completo de creación de un item de inventario en Hausdame, desde la captura inicial hasta la persistencia en base de datos, incluyendo todas las características posibles: variantes personalizadas, imágenes, normalización, validaciones y transacciones.

**Ejemplo utilizado:** "Sofá Modular de 3 Piezas" con variante de material (Tela/Cuero), ubicado en la Sala, con todas las características opcionales completadas.

---

## 🎯 Ejemplo Completo: Sofá Modular de 3 Piezas

### Datos de Entrada (Usuario)

```json
{
  "itemName": "Sofá Modular de 3 Piezas",
  "category": "FURNITURE_EQUIPMENT",
  "area": "Sala",
  "expectedQty": 1,
  "condition": "USED_LT_1Y",
  "priority": "HIGH",
  "brand": "Muebles del Norte",
  "model": "Modular Pro 2024",
  "serialNumber": "MN-SOF-2024-001234",
  "color": "Gris Perla",
  "size": "3 piezas (Sofá + Love Seat + Individual)",
  "notes": "Incluye 7 cojines decorativos. Material: Tela premium antimanchas. Estado excelente.",
  "variantKey": "material",
  "variantValue": "Tela",
  "defaultVariantKey": "material",
  "defaultVariantLabel": "Material",
  "defaultVariantOptions": ["Tela", "Cuero", "Sintético"],
  "images": [
    {
      "position": 1,
      "file": "sofa-vista-frontal.jpg"
    },
    {
      "position": 2,
      "file": "sofa-vista-lateral.jpg"
    },
    {
      "position": 3,
      "file": "sofa-detalle-cojines.jpg"
    }
  ]
}
```

---

## 🔄 Flujo Completo Paso a Paso

### FASE 1: Validación y Preparación de Datos

#### 1.1 Validación de Tenant

**Código:** `app/host/inventory/actions.ts` → `createInventoryLineAction()`

```typescript
const tenant = await getDefaultTenant();
if (!tenant) {
  throw new Error("No se encontró el tenant");
}
```

**Resultado:** 
- Tenant ID obtenido: `"clx1234567890abcdef"`

---

#### 1.2 Validación de Propiedad

**Código:** `app/host/inventory/actions.ts` → `createInventoryLineAction()`

```typescript
const propertyId = formData.get("propertyId")?.toString();
if (!propertyId) {
  throw new Error("No se encontró la propiedad");
}
```

**Resultado:**
- Property ID: `"clx9876543210fedcba"`

---

#### 1.3 Validación de Área

**Código:** `app/host/inventory/actions.ts` → `createInventoryLineAction()`

```typescript
const areaRaw = formData.get("area")?.toString() || "";
const area = areaRaw.trim();

if (!area || area.length === 0) {
  throw new Error("El área es obligatoria");
}

if (area.length > 80) {
  throw new Error("El área no puede tener más de 80 caracteres");
}
```

**Resultado:**
- Área validada: `"Sala"` (5 caracteres, válido)

---

#### 1.4 Validación de Categoría

**Código:** `app/host/inventory/actions.ts` → `createInventoryLineAction()`

```typescript
const category = formData.get("category")?.toString() as InventoryCategory | null;
if (!category || !Object.values(InventoryCategory).includes(category)) {
  throw new Error("La categoría es obligatoria y debe ser válida");
}
```

**Resultado:**
- Categoría validada: `"FURNITURE_EQUIPMENT"` (enum válido)

---

#### 1.5 Validación de Nombre de Item

**Código:** `app/host/inventory/actions.ts` → `createInventoryLineAction()`

```typescript
const itemNameRaw = formData.get("itemName")?.toString() || "";
const itemName = itemNameRaw.trim() || null;

if (!itemId && !itemName) {
  throw new Error("Debes seleccionar un ítem o ingresar un nombre");
}

if (itemName && itemName.length === 0) {
  throw new Error("El nombre del ítem es obligatorio");
}

if (itemName && itemName.length > 120) {
  throw new Error("El nombre del ítem no puede tener más de 120 caracteres");
}
```

**Resultado:**
- Nombre validado: `"Sofá Modular de 3 Piezas"` (28 caracteres, válido)

---

#### 1.6 Validación de Cantidad

**Código:** `app/host/inventory/actions.ts` → `createInventoryLineAction()`

```typescript
const expectedQtyStr = formData.get("expectedQty")?.toString();
const expectedQty = expectedQtyStr ? parseInt(expectedQtyStr, 10) : 1;

if (!expectedQty || isNaN(expectedQty) || expectedQty <= 0) {
  throw new Error("La cantidad debe ser mayor a 0");
}
```

**Resultado:**
- Cantidad validada: `1` (número entero positivo)

---

#### 1.7 Validación de Campos Opcionales

**Código:** `app/host/inventory/actions.ts` → `createInventoryLineAction()`

```typescript
const condition = formData.get("condition")?.toString() as InventoryCondition | null;
const priority = formData.get("priority")?.toString() as InventoryPriority | null;
const brand = formData.get("brand")?.toString().trim() || null;
const model = formData.get("model")?.toString().trim() || null;
const serialNumber = formData.get("serialNumber")?.toString().trim() || null;
const color = formData.get("color")?.toString().trim() || null;
const size = formData.get("size")?.toString().trim() || null;
const notes = formData.get("notes")?.toString().trim() || null;
```

**Resultado:**
- Condition: `"USED_LT_1Y"` (enum válido)
- Priority: `"HIGH"` (enum válido)
- Brand: `"Muebles del Norte"` (string válido)
- Model: `"Modular Pro 2024"` (string válido)
- SerialNumber: `"MN-SOF-2024-001234"` (string válido)
- Color: `"Gris Perla"` (string válido)
- Size: `"3 piezas (Sofá + Love Seat + Individual)"` (string válido)
- Notes: `"Incluye 7 cojines decorativos. Material: Tela premium antimanchas. Estado excelente."` (string válido)

---

#### 1.8 Validación de Variantes

**Código:** `app/host/inventory/actions.ts` → `createInventoryLineAction()`

```typescript
const variantKey = formData.get("variantKey")?.toString().trim() || null;
const variantValue = formData.get("variantValue")?.toString().trim() || null;
const defaultVariantKey = formData.get("defaultVariantKey")?.toString().trim() || null;
const defaultVariantLabel = formData.get("defaultVariantLabel")?.toString().trim() || null;
const defaultVariantOptionsRaw = formData.get("defaultVariantOptions")?.toString() || null;
```

**Resultado:**
- VariantKey: `"material"` (clave de variante)
- VariantValue: `"Tela"` (valor de variante)
- DefaultVariantKey: `"material"` (clave por defecto para el item)
- DefaultVariantLabel: `"Material"` (etiqueta para UI)
- DefaultVariantOptions: `["Tela", "Cuero", "Sintético"]` (opciones disponibles)

---

### FASE 2: Normalización y Búsqueda de Duplicados

#### 2.1 Normalización del Nombre

**Código:** `lib/inventory-normalize.ts` → `normalizeName()`

```typescript
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " "); // Colapsa múltiples espacios en uno
}
```

**Proceso:**
1. Input: `"Sofá Modular de 3 Piezas"`
2. Trim: `"Sofá Modular de 3 Piezas"` (sin cambios)
3. ToLowerCase: `"sofá modular de 3 piezas"`
4. Replace espacios múltiples: `"sofá modular de 3 piezas"` (sin cambios)

**Resultado:**
- `nameNormalized`: `"sofá modular de 3 piezas"`

---

#### 2.2 Búsqueda de Item Existente

**Código:** `lib/inventory.ts` → `createInventoryLine()`

```typescript
const nameNormalized = normalizeName(data.itemName);

const existingItem = await tx.inventoryItem.findFirst({
  where: {
    tenantId,
    category: data.category,
    nameNormalized,
  },
  select: {
    id: true,
    archivedAt: true,
  },
});
```

**Query SQL generada:**
```sql
SELECT id, "archivedAt"
FROM "InventoryItem"
WHERE "tenantId" = 'clx1234567890abcdef'
  AND category = 'FURNITURE_EQUIPMENT'
  AND "nameNormalized" = 'sofá modular de 3 piezas'
LIMIT 1;
```

**Resultado:**
- Item no existe → Se procederá a crear uno nuevo
- `isNewItem`: `true` (se establecerá después)

---

#### 2.3 Normalización del Área

**Código:** `lib/inventory.ts` → `createInventoryLine()`

```typescript
const areaNormalized = normalizeName(data.area);
```

**Proceso:**
1. Input: `"Sala"`
2. Trim: `"Sala"`
3. ToLowerCase: `"sala"`
4. Replace espacios múltiples: `"sala"`

**Resultado:**
- `areaNormalized`: `"sala"`

---

#### 2.4 Normalización de Variante

**Código:** `lib/inventory.ts` → `createInventoryLine()`

```typescript
const variantValueNormalized = data.variantValue
  ? normalizeVariantValue(data.variantValue)
  : null;
```

**Proceso:**
1. Input: `"Tela"`
2. Normalización: `"tela"`

**Resultado:**
- `variantValueNormalized`: `"tela"`

---

#### 2.5 Validación de Variante Completa

**Código:** `lib/inventory.ts` → `createInventoryLine()`

```typescript
if (variantKey && !variantValueNormalized) {
  throw new Error("Si se especifica una variante, debe tener un valor");
}
```

**Resultado:**
- Validación pasada: `variantKey` existe y `variantValueNormalized` también existe

---

#### 2.6 Verificación de Duplicados en InventoryLine

**Código:** `lib/inventory.ts` → `createInventoryLine()`

```typescript
const existingLine = await tx.inventoryLine.findFirst({
  where: {
    propertyId,
    areaNormalized,
    itemId, // Aún no existe, pero se verificará después de crear el item
    variantKey: variantKey || null,
    variantValueNormalized: variantValueNormalized || null,
    isActive: true,
  },
});
```

**Nota:** En este punto, el `itemId` aún no existe, por lo que esta verificación se realizará después de crear o encontrar el item.

---

### FASE 3: Creación de InventoryItem (Transacción)

#### 3.1 Inicio de Transacción

**Código:** `lib/inventory.ts` → `createInventoryLine()`

```typescript
return await prisma.$transaction(async (tx) => {
  // ... lógica dentro de la transacción
});
```

**Propósito:** Garantizar atomicidad: si falla cualquier paso, se revierte todo.

---

#### 3.2 Creación del Item

**Código:** `lib/inventory.ts` → `createInventoryLine()`

```typescript
const item = await tx.inventoryItem.create({
  data: {
    tenantId,
    category: data.category,
    name: data.itemName.trim(), // Mantener original con trim
    nameNormalized,
    defaultVariantKey: data.defaultVariantKey ?? null,
    archivedAt: null, // Asegurar que esté activo
  },
});
```

**Query SQL generada:**
```sql
INSERT INTO "InventoryItem" (
  id,
  "tenantId",
  category,
  name,
  "nameNormalized",
  "defaultBrand",
  "defaultModel",
  "defaultColor",
  "defaultSize",
  "isReplacable",
  "defaultVariantKey",
  "defaultVariantLabel",
  "defaultVariantOptions",
  "archivedAt",
  "createdAt",
  "updatedAt"
)
VALUES (
  'clx_new_item_id_12345', -- Generado por cuid()
  'clx1234567890abcdef',
  'FURNITURE_EQUIPMENT',
  'Sofá Modular de 3 Piezas',
  'sofá modular de 3 piezas',
  NULL, -- No se setea en createInventoryLine
  NULL, -- No se setea en createInventoryLine
  NULL, -- No se setea en createInventoryLine
  NULL, -- No se setea en createInventoryLine
  true, -- Default
  'material',
  NULL, -- No se setea en createInventoryLine (solo en createInventoryItemAction)
  NULL, -- No se setea en createInventoryLine (solo en createInventoryItemAction)
  NULL,
  NOW(),
  NOW()
)
RETURNING *;
```

**Resultado:**
- Item creado con ID: `"clx_new_item_id_12345"`
- `isNewItem`: `true`

**Nota:** Los campos `defaultBrand`, `defaultModel`, `defaultColor`, `defaultSize`, `defaultVariantLabel` y `defaultVariantOptions` NO se setean en `createInventoryLine()`, solo en `createInventoryItemAction()`. Para este ejemplo completo, asumiremos que se usó `createInventoryItemAction()` primero o que se actualizará después.

---

#### 3.3 Actualización de Item con Variantes (Si se usa createInventoryItemAction)

**Código:** `app/host/inventory/actions.ts` → `createInventoryItemAction()`

Si el item se crea usando `createInventoryItemAction()`, se incluyen los campos de variantes:

```typescript
const itemData: any = {
  tenantId: tenant.id,
  category,
  name: itemName,
  nameNormalized,
  defaultVariantKey: variantKey,
};

if (variantLabel !== null && variantLabel !== undefined && variantLabel.trim() !== "") {
  itemData.defaultVariantLabel = variantLabel;
}

if (variantOptions !== null && variantOptions !== undefined) {
  itemData.defaultVariantOptions = variantOptions;
}

item = await prisma.inventoryItem.create({
  data: itemData,
});
```

**Query SQL completa:**
```sql
INSERT INTO "InventoryItem" (
  id,
  "tenantId",
  category,
  name,
  "nameNormalized",
  "defaultVariantKey",
  "defaultVariantLabel",
  "defaultVariantOptions",
  "archivedAt",
  "createdAt",
  "updatedAt"
)
VALUES (
  'clx_new_item_id_12345',
  'clx1234567890abcdef',
  'FURNITURE_EQUIPMENT',
  'Sofá Modular de 3 Piezas',
  'sofá modular de 3 piezas',
  'material',
  'Material',
  '["Tela", "Cuero", "Sintético"]'::jsonb,
  NULL,
  NOW(),
  NOW()
)
RETURNING *;
```

**Resultado:**
- Item creado con todas las variantes configuradas

---

### FASE 4: Creación de InventoryLine (Transacción)

#### 4.1 Verificación Final de Duplicados

**Código:** `lib/inventory.ts` → `createInventoryLine()`

Ahora que tenemos el `itemId`, verificamos si ya existe una línea activa:

```typescript
const existingLine = await tx.inventoryLine.findFirst({
  where: {
    propertyId: 'clx9876543210fedcba',
    areaNormalized: 'sala',
    itemId: 'clx_new_item_id_12345',
    variantKey: 'material',
    variantValueNormalized: 'tela',
    isActive: true,
  },
  include: {
    item: {
      select: {
        name: true,
      },
    },
  },
});
```

**Query SQL generada:**
```sql
SELECT 
  il.*,
  i.name as "item.name"
FROM "InventoryLine" il
INNER JOIN "InventoryItem" i ON il."itemId" = i.id
WHERE il."propertyId" = 'clx9876543210fedcba'
  AND il."areaNormalized" = 'sala'
  AND il."itemId" = 'clx_new_item_id_12345'
  AND il."variantKey" = 'material'
  AND il."variantValueNormalized" = 'tela'
  AND il."isActive" = true
LIMIT 1;
```

**Resultado:**
- No existe línea duplicada → Se procede a crear

---

#### 4.2 Creación de la Línea

**Código:** `lib/inventory.ts` → `createInventoryLine()`

```typescript
const line = await tx.inventoryLine.create({
  data: {
    tenantId: 'clx1234567890abcdef',
    propertyId: 'clx9876543210fedcba',
    area: 'Sala', // Mantener original con trim
    areaNormalized: 'sala',
    itemId: 'clx_new_item_id_12345',
    expectedQty: 1,
    condition: InventoryCondition.USED_LT_1Y,
    priority: InventoryPriority.HIGH,
    brand: 'Muebles del Norte',
    model: 'Modular Pro 2024',
    serialNumber: 'MN-SOF-2024-001234',
    color: 'Gris Perla',
    size: '3 piezas (Sofá + Love Seat + Individual)',
    notes: 'Incluye 7 cojines decorativos. Material: Tela premium antimanchas. Estado excelente.',
    variantKey: 'material',
    variantValue: 'Tela',
    variantValueNormalized: 'tela',
    isActive: true,
  },
});
```

**Query SQL generada:**
```sql
INSERT INTO "InventoryLine" (
  id,
  "tenantId",
  "propertyId",
  area,
  "areaNormalized",
  "itemId",
  "expectedQty",
  condition,
  priority,
  brand,
  model,
  "serialNumber",
  color,
  size,
  notes,
  "variantKey",
  "variantValue",
  "variantValueNormalized",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES (
  'clx_new_line_id_67890', -- Generado por cuid()
  'clx1234567890abcdef',
  'clx9876543210fedcba',
  'Sala',
  'sala',
  'clx_new_item_id_12345',
  1,
  'USED_LT_1Y',
  'HIGH',
  'Muebles del Norte',
  'Modular Pro 2024',
  'MN-SOF-2024-001234',
  'Gris Perla',
  '3 piezas (Sofá + Love Seat + Individual)',
  'Incluye 7 cojines decorativos. Material: Tela premium antimanchas. Estado excelente.',
  'material',
  'Tela',
  'tela',
  true,
  NOW(),
  NOW()
)
RETURNING *;
```

**Resultado:**
- Línea creada con ID: `"clx_new_line_id_67890"`

---

#### 4.3 Commit de Transacción

**Código:** `lib/inventory.ts` → `createInventoryLine()`

```typescript
return { id: line.id, isNewItem, itemId };
```

**Resultado:**
- Transacción completada exitosamente
- Retorno: `{ id: "clx_new_line_id_67890", isNewItem: true, itemId: "clx_new_item_id_12345" }`

---

### FASE 5: Subida de Imágenes (Opcional)

#### 5.1 Validación de Imagen

**Código:** `app/host/inventory/image-actions.ts` → `uploadInventoryItemImageAction()`

Para cada imagen (posición 1, 2, 3):

```typescript
const itemId = formData.get("itemId")?.toString(); // "clx_new_item_id_12345"
const positionStr = formData.get("position")?.toString(); // "1", "2", "3"
const file = formData.get("file") as File | null;

// Validaciones básicas
if (!itemId) {
  throw new Error("itemId es requerido");
}

if (!positionStr) {
  throw new Error("position es requerido");
}

const position = parseInt(positionStr, 10);
if (isNaN(position) || position < 1 || position > 3) {
  throw new Error("position debe ser 1, 2 o 3");
}

if (!file) {
  throw new Error("file es requerido");
}
```

---

#### 5.2 Validación de Tipo y Tamaño

**Código:** `app/host/inventory/image-actions.ts` → `uploadInventoryItemImageAction()`

```typescript
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

if (!ALLOWED_MIME_TYPES.includes(file.type)) {
  throw new Error("Tipo de archivo no permitido. Use JPG, PNG o WebP.");
}

const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

if (buffer.length > MAX_FILE_SIZE) {
  throw new Error("El archivo es demasiado grande. Máximo 5MB.");
}
```

**Resultado:**
- Tipo válido: `image/jpeg`
- Tamaño válido: `2.3 MB` (< 5MB)

---

#### 5.3 Verificación de Ownership

**Código:** `app/host/inventory/image-actions.ts` → `uploadInventoryItemImageAction()`

```typescript
const item = await prisma.inventoryItem.findFirst({
  where: {
    id: itemId,
    tenantId: tenant.id,
  },
});

if (!item) {
  throw new Error("InventoryItem no encontrado o no pertenece a tu cuenta");
}
```

**Resultado:**
- Item encontrado y pertenece al tenant → Se procede

---

#### 5.4 Generación de Thumbnail

**Código:** `app/host/inventory/image-actions.ts` → `uploadInventoryItemImageAction()`

```typescript
const groupId = randomUUID(); // "550e8400-e29b-41d4-a716-446655440000"

const originalMetadata = await sharp(buffer).metadata();
const originalWidth = originalMetadata.width || 0; // 4032
const originalHeight = originalMetadata.height || 0; // 3024

const thumbnailResult = await generateThumbnail(buffer, file.type);
// Genera thumbnail de 256x256px manteniendo aspect ratio
```

**Resultado:**
- GroupId generado: `"550e8400-e29b-41d4-a716-446655440000"`
- Thumbnail generado: `256x256px` en formato `webp`

---

#### 5.5 Subida a Storage (Supabase)

**Código:** `app/host/inventory/image-actions.ts` → `uploadInventoryItemImageAction()`

```typescript
const fileExtension = file.name.split(".").pop() || "jpg";
const originalKey = `${tenant.id}/inventory-items/${itemId}/${groupId}/original.${fileExtension}`;
const thumbKey = `${tenant.id}/inventory-items/${itemId}/${groupId}/thumb_256.${thumbnailResult.format}`;

// Subir original
const originalUpload = await storageProvider.putPublicObject({
  bucket: "inventory-item-images",
  key: originalKey,
  contentType: file.type,
  buffer,
});

// Subir thumbnail
const thumbUpload = await storageProvider.putPublicObject({
  bucket: "inventory-item-images",
  key: thumbKey,
  contentType: getOutputMimeType(thumbnailResult.format),
  buffer: thumbnailResult.buffer,
});
```

**Rutas generadas:**
- Original: `clx1234567890abcdef/inventory-items/clx_new_item_id_12345/550e8400-e29b-41d4-a716-446655440000/original.jpg`
- Thumbnail: `clx1234567890abcdef/inventory-items/clx_new_item_id_12345/550e8400-e29b-41d4-a716-446655440000/thumb_256.webp`

---

#### 5.6 Creación de Assets en Base de Datos

**Código:** `app/host/inventory/image-actions.ts` → `uploadInventoryItemImageAction()`

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Crear Asset ORIGINAL
  const originalAsset = await tx.asset.create({
    data: {
      tenantId: tenant.id,
      groupId,
      bucket: "inventory-item-images",
      key: originalKey,
      variant: AssetVariant.ORIGINAL,
      publicUrl: originalUpload.publicUrl,
      metadata: {
        width: originalWidth,
        height: originalHeight,
        format: fileExtension,
        size: buffer.length,
      },
    },
  });

  // Crear Asset THUMB_256
  const thumbAsset = await tx.asset.create({
    data: {
      tenantId: tenant.id,
      groupId,
      bucket: "inventory-item-images",
      key: thumbKey,
      variant: AssetVariant.THUMB_256,
      publicUrl: thumbUpload.publicUrl,
      metadata: {
        width: 256,
        height: 256,
        format: thumbnailResult.format,
        size: thumbnailResult.buffer.length,
      },
    },
  });

  // Crear o actualizar InventoryItemAsset
  const itemAsset = await tx.inventoryItemAsset.upsert({
    where: {
      tenantId_itemId_position: {
        tenantId: tenant.id,
        itemId,
        position,
      },
    },
    create: {
      tenantId: tenant.id,
      itemId,
      assetId: thumbAsset.id, // Guardamos referencia al thumbnail
      position,
    },
    update: {
      assetId: thumbAsset.id, // Actualizar si ya existía
    },
  });

  return {
    position,
    groupId,
    thumbUrl: thumbAsset.publicUrl,
    originalUrl: originalAsset.publicUrl,
    assetIds: {
      original: originalAsset.id,
      thumb: thumbAsset.id,
    },
  };
});
```

**Queries SQL generadas:**

```sql
-- 1. Crear Asset ORIGINAL
INSERT INTO "Asset" (
  id,
  "tenantId",
  "groupId",
  bucket,
  key,
  variant,
  "publicUrl",
  metadata,
  "createdAt",
  "updatedAt"
)
VALUES (
  'clx_asset_original_1',
  'clx1234567890abcdef',
  '550e8400-e29b-41d4-a716-446655440000',
  'inventory-item-images',
  'clx1234567890abcdef/inventory-items/clx_new_item_id_12345/550e8400-e29b-41d4-a716-446655440000/original.jpg',
  'ORIGINAL',
  'https://supabase.co/storage/v1/object/public/inventory-item-images/.../original.jpg',
  '{"width": 4032, "height": 3024, "format": "jpg", "size": 2411520}'::jsonb,
  NOW(),
  NOW()
);

-- 2. Crear Asset THUMB_256
INSERT INTO "Asset" (
  id,
  "tenantId",
  "groupId",
  bucket,
  key,
  variant,
  "publicUrl",
  metadata,
  "createdAt",
  "updatedAt"
)
VALUES (
  'clx_asset_thumb_1',
  'clx1234567890abcdef',
  '550e8400-e29b-41d4-a716-446655440000',
  'inventory-item-images',
  'clx1234567890abcdef/inventory-items/clx_new_item_id_12345/550e8400-e29b-41d4-a716-446655440000/thumb_256.webp',
  'THUMB_256',
  'https://supabase.co/storage/v1/object/public/inventory-item-images/.../thumb_256.webp',
  '{"width": 256, "height": 256, "format": "webp", "size": 15234}'::jsonb,
  NOW(),
  NOW()
);

-- 3. Crear InventoryItemAsset
INSERT INTO "InventoryItemAsset" (
  id,
  "tenantId",
  "itemId",
  "assetId",
  position,
  "createdAt"
)
VALUES (
  'clx_item_asset_1',
  'clx1234567890abcdef',
  'clx_new_item_id_12345',
  'clx_asset_thumb_1', -- Referencia al thumbnail
  1,
  NOW()
)
ON CONFLICT ("tenantId", "itemId", position)
DO UPDATE SET "assetId" = EXCLUDED."assetId";
```

**Resultado:**
- 3 imágenes subidas (posiciones 1, 2, 3)
- 6 Assets creados (3 originales + 3 thumbnails)
- 3 InventoryItemAsset creados (uno por posición)

---

### FASE 6: Revalidación y Respuesta

#### 6.1 Revalidación de Path

**Código:** `app/host/inventory/actions.ts` → `createInventoryLineAction()`

```typescript
revalidatePath(`/host/properties/${propertyId}/inventory`);
```

**Propósito:** Invalidar caché de Next.js para que la página muestre los cambios inmediatamente.

---

#### 6.2 Respuesta Final

**Código:** `app/host/inventory/actions.ts` → `createInventoryLineAction()`

```typescript
return {
  itemId: finalItemId,
  itemName: finalItemName,
};
```

**Resultado:**
```json
{
  "itemId": "clx_new_item_id_12345",
  "itemName": "Sofá Modular de 3 Piezas"
}
```

---

## 📊 Resumen de Datos Creados

### InventoryItem

```json
{
  "id": "clx_new_item_id_12345",
  "tenantId": "clx1234567890abcdef",
  "category": "FURNITURE_EQUIPMENT",
  "name": "Sofá Modular de 3 Piezas",
  "nameNormalized": "sofá modular de 3 piezas",
  "defaultBrand": null,
  "defaultModel": null,
  "defaultColor": null,
  "defaultSize": null,
  "isReplacable": true,
  "defaultVariantKey": "material",
  "defaultVariantLabel": "Material",
  "defaultVariantOptions": ["Tela", "Cuero", "Sintético"],
  "archivedAt": null,
  "createdAt": "2025-01-XXT10:30:00.000Z",
  "updatedAt": "2025-01-XXT10:30:00.000Z"
}
```

### InventoryLine

```json
{
  "id": "clx_new_line_id_67890",
  "tenantId": "clx1234567890abcdef",
  "propertyId": "clx9876543210fedcba",
  "area": "Sala",
  "areaNormalized": "sala",
  "itemId": "clx_new_item_id_12345",
  "expectedQty": 1,
  "condition": "USED_LT_1Y",
  "priority": "HIGH",
  "brand": "Muebles del Norte",
  "model": "Modular Pro 2024",
  "serialNumber": "MN-SOF-2024-001234",
  "color": "Gris Perla",
  "size": "3 piezas (Sofá + Love Seat + Individual)",
  "notes": "Incluye 7 cojines decorativos. Material: Tela premium antimanchas. Estado excelente.",
  "variantKey": "material",
  "variantValue": "Tela",
  "variantValueNormalized": "tela",
  "isActive": true,
  "createdAt": "2025-01-XXT10:30:00.000Z",
  "updatedAt": "2025-01-XXT10:30:00.000Z"
}
```

### InventoryItemAsset (3 registros)

```json
[
  {
    "id": "clx_item_asset_1",
    "tenantId": "clx1234567890abcdef",
    "itemId": "clx_new_item_id_12345",
    "assetId": "clx_asset_thumb_1",
    "position": 1,
    "createdAt": "2025-01-XXT10:31:00.000Z"
  },
  {
    "id": "clx_item_asset_2",
    "tenantId": "clx1234567890abcdef",
    "itemId": "clx_new_item_id_12345",
    "assetId": "clx_asset_thumb_2",
    "position": 2,
    "createdAt": "2025-01-XXT10:31:30.000Z"
  },
  {
    "id": "clx_item_asset_3",
    "tenantId": "clx1234567890abcdef",
    "itemId": "clx_new_item_id_12345",
    "assetId": "clx_asset_thumb_3",
    "position": 3,
    "createdAt": "2025-01-XXT10:32:00.000Z"
  }
]
```

### Asset (6 registros: 3 originales + 3 thumbnails)

```json
[
  {
    "id": "clx_asset_original_1",
    "groupId": "550e8400-e29b-41d4-a716-446655440000",
    "variant": "ORIGINAL",
    "publicUrl": "https://supabase.co/storage/v1/object/public/inventory-item-images/.../original.jpg"
  },
  {
    "id": "clx_asset_thumb_1",
    "groupId": "550e8400-e29b-41d4-a716-446655440000",
    "variant": "THUMB_256",
    "publicUrl": "https://supabase.co/storage/v1/object/public/inventory-item-images/.../thumb_256.webp"
  }
  // ... 4 más (2 originales + 2 thumbnails)
]
```

---

## 🔍 Puntos Clave del Proceso

### 1. Normalización
- **Propósito:** Evitar duplicados semánticos
- **Ejemplo:** `"Sofá Modular de 3 Piezas"` → `"sofá modular de 3 piezas"`
- **Aplicado a:** `name`, `area`, `variantValue`

### 2. Transacciones
- **Propósito:** Garantizar atomicidad
- **Escenarios:** Creación de Item + Line, Subida de imágenes (Original + Thumbnail + InventoryItemAsset)

### 3. Validaciones
- **Tenant-scope:** Todos los datos pertenecen al tenant actual
- **Property-scope:** Las líneas pertenecen a una propiedad específica
- **Duplicados:** Se verifica antes de crear (a menos que `allowDuplicate=true`)

### 4. Variantes
- **Nivel Item:** `defaultVariantKey`, `defaultVariantLabel`, `defaultVariantOptions`
- **Nivel Line:** `variantKey`, `variantValue`, `variantValueNormalized`
- **Propósito:** Permitir múltiples variantes del mismo item (ej: Sofá en Tela vs Cuero)

### 5. Imágenes
- **Límite:** 3 imágenes por item (posiciones 1, 2, 3)
- **Formato:** Original + Thumbnail 256x256px
- **Storage:** Supabase bucket público
- **Referencia:** InventoryItemAsset apunta al thumbnail (no al original)

### 6. Restauración de Items Archivados
- Si se intenta crear un item con nombre normalizado que ya existe pero está archivado (`archivedAt IS NOT NULL`), se restaura automáticamente (`archivedAt = NULL`)

---

## ⚠️ Casos Especiales

### Caso 1: Item Existente
Si el item ya existe (mismo `nameNormalized` y `category`):
- Se reutiliza el `itemId` existente
- No se crea un nuevo item
- `isNewItem = false`

### Caso 2: Línea Duplicada
Si ya existe una línea activa con el mismo `itemId`, `areaNormalized`, `variantKey` y `variantValueNormalized`:
- Se lanza error: `"Este ítem ya existe en el área..."` (a menos que `allowDuplicate=true`)
- No se crea la línea duplicada

### Caso 3: Item Archivado
Si el item existe pero está archivado:
- Se restaura automáticamente (`archivedAt = NULL`)
- Se reutiliza el `itemId`
- `isNewItem = false`

### Caso 4: Variante Incompleta
Si se especifica `variantKey` pero no `variantValue`:
- Se lanza error: `"Si se especifica una variante, debe tener un valor"`
- No se crea la línea

---

## 📝 Notas Finales

1. **Campos Opcionales:** La mayoría de campos son opcionales. Solo `category`, `name`, `area` y `expectedQty` son obligatorios.

2. **Defaults:** Si no se especifican, se usan:
   - `condition`: `USED_LT_1Y`
   - `priority`: `MEDIUM`
   - `isReplacable`: `true`
   - `isActive`: `true`

3. **Normalización Automática:** Los campos `*Normalized` se generan automáticamente y no deben setearse manualmente.

4. **Imágenes Opcionales:** Las imágenes son completamente opcionales y se pueden agregar después de crear el item.

5. **Variantes Opcionales:** Las variantes son opcionales. Solo se usan cuando un mismo item tiene variaciones (ej: material, tamaño, color).

---

**Fin del documento**

