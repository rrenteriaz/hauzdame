# Análisis: Sistema de Imágenes en Inventario — Referencia para Implementación en Tareas de Checklist

**Fecha:** 2025-01-XX  
**Objetivo:** Documentar cómo funcionan las imágenes en Inventario para replicar el mismo patrón en Tareas de Checklist  
**Estado:** Análisis completo basado en código existente

---

## 1. Resumen Ejecutivo

**"Así funcionan hoy las imágenes de Inventario en Hausdame"**

El sistema de imágenes de Inventario permite agregar hasta 3 imágenes por `InventoryItem` (catálogo de items reutilizables). Las imágenes se almacenan en Supabase Storage, se vinculan mediante una tabla de relación (`InventoryItemAsset`), y se gestionan mediante server actions con validaciones de seguridad multi-tenant.

**Características clave:**
- Máximo 3 imágenes por item (posiciones 1, 2, 3)
- Cada imagen genera 2 assets: original + thumbnail (256px)
- Storage público en Supabase (bucket: `inventory-item-images`)
- Validaciones estrictas: tenant-scope, tamaño (5MB), tipos permitidos (JPG, PNG, WebP)
- UI optimizada: carga batch en SSR, thumbnails en listas, modales para gestión
- Patrón de reemplazo: subir en posición existente reemplaza la imagen anterior

---

## 2. Diagrama Mental del Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│ UI (Cliente)                                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ InventoryItemImageSlots                                      │ │
│ │ - Muestra 3 slots (1-3)                                     │ │
│ │ - Input file oculto por slot                                 │ │
│ │ - Estados: uploading, deleting, error                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ FormData: { itemId, position, file }
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Server Action                                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ uploadInventoryItemImageAction (image-actions.ts)           │ │
│ │                                                               │ │
│ │ 1. Validaciones:                                             │ │
│ │    - Tenant existe                                            │ │
│ │    - itemId válido                                            │ │
│ │    - position (1-3)                                          │ │
│ │    - file existe                                              │ │
│ │    - tipo MIME permitido (JPG, PNG, WebP)                    │ │
│ │    - tamaño <= 5MB                                           │ │
│ │                                                               │ │
│ │ 2. Verificar ownership:                                       │ │
│ │    - InventoryItem existe                                    │ │
│ │    - InventoryItem.tenantId === tenant.id                    │ │
│ │                                                               │ │
│ │ 3. Generar assets:                                           │ │
│ │    - groupId = randomUUID()                                   │ │
│ │    - Original: buffer completo                               │ │
│ │    - Thumbnail: generateThumbnail(buffer, mimeType)          │ │
│ │                                                               │ │
│ │ 4. Storage (Supabase):                                       │ │
│ │    - Original: {tenantId}/inventory-items/{itemId}/{groupId}/│ │
│ │                original.{ext}                                │ │
│ │    - Thumb: {tenantId}/inventory-items/{itemId}/{groupId}/   │ │
│ │            thumb_256.{format}                                 │ │
│ │                                                               │ │
│ │ 5. Base de datos (Transaction):                              │ │
│ │    - Crear Asset (ORIGINAL)                                  │ │
│ │    - Crear Asset (THUMB_256)                                 │ │
│ │    - Upsert InventoryItemAsset (apunta a THUMB)            │ │
│ │                                                               │ │
│ │ 6. Cleanup en error:                                        │ │
│ │    - Si falla DB, borrar archivos de storage                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Retorna: { position, groupId, thumbUrl, 
                     │           originalUrl, assetIds }
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Persistencia                                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Asset (tabla genérica)                                      │ │
│ │ - id, tenantId, type: IMAGE                                 │ │
│ │ - variant: ORIGINAL | THUMB_256                             │ │
│ │ - bucket, key, publicUrl                                     │ │
│ │ - groupId (agrupa original + thumb)                         │ │
│ │                                                               │ │
│ │ InventoryItemAsset (tabla de relación)                      │ │
│ │ - id, tenantId, itemId, assetId, position (1-3)             │ │
│ │ - @@unique([tenantId, itemId, position])                     │ │
│ │ - @@unique([tenantId, itemId, assetId])                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Render (SSR o Cliente)                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ getInventoryItemImageThumbs(itemId)                         │ │
│ │ - Query InventoryItemAsset por itemId                       │ │
│ │ - Query Asset por groupIds (THUMB_256 preferido)            │ │
│ │ - Retorna [thumb1, thumb2, thumb3] o [null, null, null]    │ │
│ │                                                               │ │
│ │ getInventoryItemImageThumbsBatch(itemIds[])                 │ │
│ │ - Batch para múltiples items (optimización SSR)             │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Modelo de Datos (Inventario)

### 3.1 Tabla de Relación: `InventoryItemAsset`

**Ubicación:** `prisma/schema.prisma` (líneas 882-897)

```prisma
model InventoryItemAsset {
  id        String        @id @default(cuid())
  tenantId  String
  itemId    String
  assetId   String
  position  Int           // 1, 2 o 3
  createdAt DateTime      @default(now())
  
  asset     Asset         @relation(fields: [assetId], references: [id], onDelete: Cascade)
  item      InventoryItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  tenant    Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, itemId, position])  // Máximo 1 imagen por posición
  @@unique([tenantId, itemId, assetId])  // Evitar duplicados
  @@index([tenantId, itemId])
  @@index([tenantId, assetId])
}
```

**Campos clave:**
- `id`: PK (cuid)
- `tenantId`: FK a Tenant (onDelete: Cascade)
- `itemId`: FK a InventoryItem (onDelete: Cascade)
- `assetId`: FK a Asset (onDelete: Cascade) — **apunta al THUMB, no al original**
- `position`: Int (1, 2 o 3) — posición del slot

**Constraints importantes:**
- `@@unique([tenantId, itemId, position])`: Garantiza máximo 1 imagen por posición
- `@@unique([tenantId, itemId, assetId])`: Evita duplicar el mismo asset en el mismo item
- `onDelete: Cascade`: Si se borra el item o el asset, se borra la relación automáticamente

**Por qué se eligió este modelo:**
- Tabla de relación separada permite múltiples imágenes sin modificar `InventoryItem`
- `position` como campo explícito (no array JSON) permite queries eficientes y constraints únicos
- `assetId` apunta al thumb (no al original) para optimizar queries de listas
- El original se obtiene vía `groupId` cuando se necesita

### 3.2 Tabla Genérica: `Asset`

**Ubicación:** `prisma/schema.prisma` (líneas 840-877)

```prisma
model Asset {
  id            String   @id @default(cuid())
  tenantId      String
  type          AssetType        // IMAGE
  provider      AssetProvider     // SUPABASE
  variant       AssetVariant      // ORIGINAL | THUMB_256
  bucket        String
  key           String            // Path completo en storage
  publicUrl     String?
  mimeType      String
  sizeBytes     Int
  width         Int?
  height        Int?
  groupId       String            // Agrupa original + thumb
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdByUserId String?
  deletedAt     DateTime?
  takenAt       DateTime?
  uploadedAt    DateTime @default(now())
  
  // Relaciones múltiples
  inventoryItemAssets InventoryItemAsset[]
  // ... otras relaciones (PropertyCover, CleaningMedia, etc.)

  @@unique([tenantId, bucket, key])
  @@index([tenantId, groupId])
  @@index([tenantId, type])
  @@index([groupId])
}
```

**Campos clave para imágenes de inventario:**
- `type`: `IMAGE`
- `provider`: `SUPABASE`
- `variant`: `ORIGINAL` o `THUMB_256`
- `bucket`: `"inventory-item-images"`
- `key`: Path completo (ej: `{tenantId}/inventory-items/{itemId}/{groupId}/original.jpg`)
- `publicUrl`: URL pública de Supabase
- `groupId`: UUID que agrupa original + thumbnail del mismo upload

**Por qué se usa tabla genérica:**
- `Asset` es reutilizable para múltiples contextos (inventario, propiedades, limpiezas, chat)
- `variant` permite múltiples versiones (original, thumb) sin duplicar lógica
- `groupId` permite relacionar assets del mismo "upload" sin foreign keys explícitas

### 3.3 Relación con InventoryItem

**Ubicación:** `prisma/schema.prisma` (líneas 901-919)

```prisma
model InventoryItem {
  // ... campos del item ...
  inventoryItemAssets InventoryItemAsset[]
}
```

**Características:**
- Relación one-to-many: un `InventoryItem` puede tener múltiples `InventoryItemAsset`
- No hay campo directo en `InventoryItem` para imágenes (se accede vía relación)
- Las imágenes se obtienen mediante queries a `InventoryItemAsset`

---

## 4. Storage (Supabase)

### 4.1 Bucket

**Nombre:** `inventory-item-images`  
**Tipo:** Público (URLs públicas, no signed URLs)  
**Ubicación:** Supabase Storage

### 4.2 Convención de Paths

**Template:**
```
{tenantId}/inventory-items/{itemId}/{groupId}/original.{ext}
{tenantId}/inventory-items/{itemId}/{groupId}/thumb_256.{format}
```

**Ejemplo real:**
```
abc123/inventory-items/item_xyz/550e8400-e29b-41d4-a716-446655440000/original.jpg
abc123/inventory-items/item_xyz/550e8400-e29b-41d4-a716-446655440000/thumb_256.webp
```

**Componentes:**
- `{tenantId}`: ID del tenant (seguridad multi-tenant)
- `inventory-items`: Prefijo fijo para inventario
- `{itemId}`: ID del InventoryItem
- `{groupId}`: UUID generado por upload (agrupa original + thumb)
- `original.{ext}`: Extensión del archivo original (jpg, png, webp)
- `thumb_256.{format}`: Formato del thumbnail (webp preferido, fallback jpeg/png)

**Por qué esta estructura:**
- `tenantId` al inicio permite políticas de acceso por tenant en Supabase
- `itemId` agrupa todas las imágenes de un item
- `groupId` permite identificar pares original+thumb sin queries adicionales
- Separación `original/thumb` facilita cleanup y gestión

### 4.3 URLs de Acceso

**Tipo:** URLs públicas (no signed)  
**Generación:** `supabase.storage.from(bucket).getPublicUrl(key)`  
**Formato:** `https://{supabase-url}/storage/v1/object/public/{bucket}/{key}`

**Ejemplo:**
```
https://xyz.supabase.co/storage/v1/object/public/inventory-item-images/abc123/inventory-items/item_xyz/550e8400-e29b-41d4-a716-446655440000/thumb_256.webp
```

**Ventajas:**
- No requiere autenticación para leer
- Cacheable por CDN
- No expira (a diferencia de signed URLs)

**Desventajas:**
- URLs largas
- Acceso público (mitigado por estructura con tenantId)

### 4.4 Límites y Validaciones

**Tamaño máximo:** 5MB por archivo  
**Tipos permitidos:** `image/jpeg`, `image/jpg`, `image/png`, `image/webp`  
**Validación:** Cliente (pre-upload) + Servidor (obligatorio)

**Ubicación:** `app/host/inventory/image-actions.ts` (líneas 12-13)

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
```

---

## 5. Helpers / Servicios

### 5.1 Storage Provider (Abstracción)

**Ubicación:** `lib/storage/index.ts`, `lib/storage/supabaseStorage.ts`, `lib/storage/types.ts`

**Interfaz:**
```typescript
interface StorageProvider {
  putPublicObject(params: PutPublicObjectParams): Promise<PutPublicObjectResult>;
  deleteObject(params: DeleteObjectParams): Promise<void>;
}
```

**Implementación actual:** `SupabaseStorageProvider`

**Características:**
- Abstracción permite cambiar de Supabase a AWS S3 sin modificar lógica de negocio
- `putPublicObject`: Sube archivo y retorna URL pública
- `deleteObject`: Elimina archivo (idempotente, no falla si no existe)

**Reutilización para Tareas:**
- ✅ **REUTILIZABLE DIRECTO**: No requiere cambios, solo cambiar bucket name

### 5.2 Generación de Thumbnails

**Ubicación:** `lib/media/thumbnail.ts`

**Función principal:**
```typescript
export async function generateThumbnail(
  inputBuffer: Buffer,
  mimeType: string
): Promise<ThumbnailResult>
```

**Características:**
- Usa `sharp` para redimensionar
- Tamaño: 256px en el lado más largo (mantiene aspect ratio)
- Formato: WebP preferido, fallback PNG/JPEG según original
- Calidad: 85% para WebP/JPEG, compressionLevel 9 para PNG

**Reutilización para Tareas:**
- ✅ **REUTILIZABLE DIRECTO**: No requiere cambios

### 5.3 Obtención de Thumbnails

**Ubicación:** `lib/media/getInventoryItemImageThumbs.ts`

**Funciones:**
1. `getInventoryItemImageThumbs(itemId: string)`: Single item
2. `getInventoryItemImageThumbsBatch(itemIds: string[])`: Batch (optimización SSR)

**Lógica:**
- Query `InventoryItemAsset` por `itemId`, ordenado por `position`
- Extrae `groupId` de cada asset
- Query `Asset` por `groupId`, filtrando `variant IN ['THUMB_256', 'ORIGINAL']`
- Prefiere `THUMB_256`, fallback a `ORIGINAL`
- Retorna array `[thumb1, thumb2, thumb3]` o `[null, null, null]`

**Reutilización para Tareas:**
- ⚠️ **REQUIERE GENERALIZACIÓN**: Asume `InventoryItemAsset` y `itemId`
- Necesitaría versión genérica: `getChecklistItemImageThumbs(checklistItemId: string)`
- O helper parametrizado: `getEntityImageThumbs(entityType: 'inventory' | 'checklist', entityId: string)`

### 5.4 Server Actions

**Ubicación:** `app/host/inventory/image-actions.ts`

**Funciones:**
1. `uploadInventoryItemImageAction(formData: FormData)`
2. `deleteInventoryItemImageAction(formData: FormData)`

**Validaciones críticas (DEBEN copiarse para Tareas):**
- ✅ Verificar tenant existe
- ✅ Verificar `itemId` existe y pertenece al tenant
- ✅ Validar `position` (1-3)
- ✅ Validar tipo MIME
- ✅ Validar tamaño (5MB)
- ✅ Verificar ownership del item antes de crear assets
- ✅ Transaction para atomicidad (crear assets + relación)
- ✅ Cleanup de storage si falla DB

**Reutilización para Tareas:**
- ⚠️ **REQUIERE GENERALIZACIÓN**: Asume `InventoryItem` y `InventoryItemAsset`
- Necesitaría versión genérica o parámetro `entityType`
- La lógica de validación y storage es reutilizable

---

## 6. Server Actions / API

### 6.1 Upload de Imagen

**Ubicación:** `app/host/inventory/image-actions.ts` (líneas 22-205)

**Flujo completo:**

1. **Validaciones iniciales:**
   ```typescript
   - Tenant existe
   - itemId presente
   - position presente y válido (1-3)
   - file presente
   - Tipo MIME permitido
   - Tamaño <= 5MB
   ```

2. **Verificación de ownership:**
   ```typescript
   const item = await prisma.inventoryItem.findFirst({
     where: { id: itemId, tenantId: tenant.id }
   });
   if (!item) throw new Error("...");
   ```

3. **Generación de assets:**
   ```typescript
   - groupId = randomUUID()
   - Original: buffer completo
   - Thumbnail: generateThumbnail(buffer, mimeType)
   ```

4. **Storage (Supabase):**
   ```typescript
   - Original: putPublicObject({ bucket, key: originalKey, buffer })
   - Thumb: putPublicObject({ bucket, key: thumbKey, buffer: thumbBuffer })
   ```

5. **Base de datos (Transaction):**
   ```typescript
   await prisma.$transaction(async (tx) => {
     - Crear Asset (ORIGINAL)
     - Crear Asset (THUMB_256)
     - Upsert InventoryItemAsset (apunta a THUMB)
   });
   ```

6. **Cleanup en error:**
   ```typescript
   catch (error) {
     - deleteObject(originalKey)
     - deleteObject(thumbKey)
     throw error;
   }
   ```

**Validaciones críticas (MUST para Tareas):**
- ✅ Tenant-scope: siempre verificar `tenantId`
- ✅ Ownership: verificar que el item/tarea pertenece al tenant
- ✅ Transaction: atomicidad entre storage y DB
- ✅ Cleanup: borrar storage si falla DB
- ✅ Validación de tipos: no confiar solo en cliente

### 6.2 Delete de Imagen

**Ubicación:** `app/host/inventory/image-actions.ts` (líneas 216-262)

**Flujo:**
1. Validar tenant, itemId, position
2. Verificar ownership del item
3. `deleteMany` de `InventoryItemAsset` (desvincula)
4. **NOTA:** Los Assets quedan huérfanos (no se borran)

**Comportamiento actual:**
- Solo desvincula la relación
- No borra los Assets de la tabla `Asset`
- No borra archivos de storage
- Permite recuperación si es necesario

**Para Tareas:**
- ⚠️ **DECISIÓN REQUERIDA**: ¿Borrar assets y storage o solo desvincular?
- Actualmente solo desvincula (permite recuperación)
- Se puede implementar cleanup después si es necesario

---

## 7. UI / UX

### 7.1 Componente Principal: `InventoryItemImageSlots`

**Ubicación:** `app/host/properties/[id]/inventory/InventoryItemImageSlots.tsx`

**Características:**
- Componente cliente (`"use client"`)
- Muestra 3 slots (posiciones 1, 2, 3)
- Estados: `uploadingPosition`, `deletingPosition`, `error`
- Input file oculto por slot (accesible vía label o botón)
- Validación cliente antes de upload (tipo, tamaño)
- Actualización optimista del estado local

**Props:**
```typescript
interface InventoryItemImageSlotsProps {
  itemId: string;
  initialThumbs: Array<string | null>; // [thumb1, thumb2, thumb3]
  onThumbsChange?: (thumbs: Array<string | null>) => void;
}
```

**Comportamiento:**
- Si hay imagen: muestra thumbnail + botones "Reemplazar" y "Eliminar"
- Si no hay imagen: muestra label clickeable "Agregar"
- Máximo 3 slots visibles (muestra slots ocupados + 1 vacío)
- Loading states: "Subiendo..." / "Eliminando..."

**Reutilización para Tareas:**
- ✅ **REUTILIZABLE CON CAMBIOS MÍNIMOS**: Cambiar `itemId` por `checklistItemId` y props relacionadas

### 7.2 Modal de Gestión: `AddItemPhotosModal`

**Ubicación:** `app/host/properties/[id]/inventory/AddItemPhotosModal.tsx`

**Características:**
- Modal overlay (z-index 60)
- Carga thumbs al abrir (`getInventoryItemThumbsAction`)
- Usa `InventoryItemImageSlots` internamente
- Botón "Listo" para cerrar

**Reutilización para Tareas:**
- ✅ **REUTILIZABLE CON CAMBIOS MÍNIMOS**: Cambiar nombre y props

### 7.3 Integración en Lista

**Ubicación:** `app/host/properties/[id]/inventory/InventoryList.tsx` (líneas 91-100)

**Patrón:**
- Icono de imagen siempre visible (no solo cuando hay fotos)
- Click abre `AddItemPhotosModal`
- Thumbnail se muestra en `ListThumb` si existe

**Código relevante:**
```typescript
<button
  onClick={(e) => {
    e.stopPropagation();
    setPhotosItemId(line.item.id);
    setPhotosItemName(line.item.name);
    setIsPhotosModalOpen(true);
  }}
  className="p-1 text-neutral-400 hover:text-neutral-600"
  aria-label={itemThumbs.some(thumb => thumb !== null) 
    ? "Gestionar fotos" 
    : "Agregar fotos"}
>
  {/* Icono SVG */}
</button>
```

**Reutilización para Tareas:**
- ✅ **PATRÓN REUTILIZABLE**: Mismo patrón de icono siempre visible

### 7.4 Carga en SSR

**Ubicación:** `app/host/properties/[id]/inventory/page.tsx` (líneas 98-100)

**Patrón:**
```typescript
// Obtener thumbs de imágenes para todos los items (batch)
const itemIds = [...new Set(inventoryLines.map((line) => line.item.id))];
const itemThumbsMap = await getInventoryItemImageThumbsBatch(itemIds);
```

**Características:**
- Batch query para múltiples items (optimización)
- Se pasa `itemThumbsMap` como prop al componente cliente
- Evita múltiples queries individuales

**Reutilización para Tareas:**
- ✅ **PATRÓN REUTILIZABLE**: Batch query en SSR, pasar como prop

---

## 8. Performance

### 8.1 SSR (Server-Side Rendering)

**Qué se carga en SSR:**
- Lista de items con datos básicos
- Thumbnails batch (`getInventoryItemImageThumbsBatch`)
- Selects mínimos en Prisma (solo campos necesarios)

**Qué NO se carga en SSR:**
- Archivos binarios (solo URLs)
- Assets originales (solo thumbnails)
- Metadata pesada

**Ubicación:** `app/host/properties/[id]/inventory/page.tsx`

**Optimización:**
- Batch query evita N+1 queries
- Solo se cargan thumbnails (no originales)
- URLs públicas (no requiere autenticación adicional)

### 8.2 Cliente

**Qué se carga en cliente:**
- Componente `InventoryItemImageSlots` (interactivo)
- Estados de upload/delete
- Validación pre-upload

**Qué NO se carga en cliente:**
- Archivos binarios hasta upload
- Queries adicionales (usa props de SSR)

### 8.3 Buenas Prácticas (DEBEN respetarse para Tareas)

1. ✅ **Batch queries en SSR**: No hacer queries individuales por item
2. ✅ **Selects mínimos**: Solo campos necesarios en Prisma queries
3. ✅ **Thumbnails en listas**: No cargar originales hasta modal/viewer
4. ✅ **URLs públicas**: No usar signed URLs si no es necesario
5. ✅ **Lazy loading**: Cargar imágenes solo cuando se necesitan
6. ✅ **Estados optimistas**: Actualizar UI inmediatamente, luego sync con servidor

---

## 9. Contratos / Documentación

### 9.1 Contrato PROPERTIES_V1.md

**Ubicación:** `docs/contracts/PROPERTIES_V1.md`

**Menciones de imágenes:**
- Línea 28: "NO es un sistema de fotos: No se implementan fotos por tarea en checklist (FUERA DE ALCANCE)"
- Línea 312: "Implementar fotos por tarea (FUERA DE ALCANCE)"
- Línea 495: "FUERA DE ALCANCE: No se implementan fotos por tarea en checklist (v1)"

**Estado actual:**
- Las imágenes de inventario NO están documentadas explícitamente en el contrato
- Las imágenes de tareas están marcadas como FUERA DE ALCANCE

**Para implementación de Tareas:**
- ⚠️ **ACTUALIZAR CONTRATO**: Remover "FUERA DE ALCANCE" y documentar comportamiento

### 9.2 Suposiciones Implícitas

**Basadas en código:**
- Un item puede tener 0-3 imágenes (no más)
- Las imágenes se ordenan por posición (1, 2, 3)
- Reemplazar imagen en posición existente sobrescribe la anterior
- Los thumbnails se usan para listas, originales para modales/viewers
- Las imágenes son opcionales (no requeridas)

**Para Tareas:**
- ✅ **MISMO COMPORTAMIENTO**: Aplicar las mismas suposiciones

---

## 10. Checklist de Reutilización para TAREAS

### 10.1 Qué Copiar Tal Cual

- ✅ **Modelo `Asset`**: Ya existe, reutilizable sin cambios
- ✅ **Storage Provider**: `lib/storage/index.ts` — reutilizable, solo cambiar bucket
- ✅ **Thumbnail generation**: `lib/media/thumbnail.ts` — reutilizable sin cambios
- ✅ **Validaciones de seguridad**: Tenant-scope, ownership, tipos MIME, tamaño
- ✅ **Patrón de Transaction**: Crear assets + relación en transaction
- ✅ **Cleanup en error**: Borrar storage si falla DB
- ✅ **Componente UI `InventoryItemImageSlots`**: Reutilizable con cambios mínimos (renombrar props)
- ✅ **Modal `AddItemPhotosModal`**: Reutilizable con cambios mínimos
- ✅ **Patrón de batch query**: SSR con batch para múltiples items
- ✅ **Convención de paths**: Mismo patrón, cambiar prefijo `inventory-items` → `checklist-items`

### 10.2 Qué Abstraer / Generalizar

- ⚠️ **Tabla de relación**: Crear `ChecklistItemAsset` (similar a `InventoryItemAsset`)
  - Campos: `id`, `tenantId`, `checklistItemId`, `assetId`, `position`
  - Constraints: `@@unique([tenantId, checklistItemId, position])`
  - Relación: `PropertyChecklistItem` → `ChecklistItemAsset[]`

- ⚠️ **Helper de thumbs**: Generalizar `getInventoryItemImageThumbs` o crear `getChecklistItemImageThumbs`
  - Misma lógica, diferente tabla de relación
  - Batch version también necesaria

- ⚠️ **Server actions**: Crear `app/host/properties/checklist-image-actions.ts`
  - `uploadChecklistItemImageAction`
  - `deleteChecklistItemImageAction`
  - Misma lógica que inventario, diferente entidad

- ⚠️ **Bucket name**: Usar bucket diferente o mismo con paths diferentes
  - Opción A: Nuevo bucket `checklist-item-images`
  - Opción B: Mismo bucket, paths diferentes (`{tenantId}/checklist-items/...`)

### 10.3 Qué NO Tocar

- ❌ **Modelo `Asset`**: No modificar, es genérico y funciona
- ❌ **Storage Provider**: No modificar, abstracción correcta
- ❌ **Thumbnail generation**: No modificar, lógica correcta
- ❌ **Validaciones de seguridad**: No relajar, mantener estrictas
- ❌ **Patrón de Transaction**: No cambiar, garantiza atomicidad
- ❌ **Convención de paths**: No cambiar estructura (tenantId/itemId/groupId)

---

## 11. Recomendación Técnica

### 11.1 Modelo de Datos: Tabla Propia (Recomendado)

**Opción A: Tabla de relación `ChecklistItemAsset` (RECOMENDADO)**

**Justificación:**
- ✅ Consistencia arquitectónica con Inventario
- ✅ Permite queries eficientes (índices, constraints únicos)
- ✅ Facilita batch queries en SSR
- ✅ Permite validaciones a nivel de DB (unique constraints)
- ✅ Escalable (fácil agregar metadata después)

**Estructura propuesta:**
```prisma
model ChecklistItemAsset {
  id            String              @id @default(cuid())
  tenantId      String
  checklistItemId String            // FK a PropertyChecklistItem
  assetId       String
  position      Int                 // 1, 2 o 3
  createdAt     DateTime            @default(now())
  
  asset         Asset               @relation(fields: [assetId], references: [id], onDelete: Cascade)
  checklistItem PropertyChecklistItem @relation(fields: [checklistItemId], references: [id], onDelete: Cascade)
  tenant        Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, checklistItemId, position])
  @@unique([tenantId, checklistItemId, assetId])
  @@index([tenantId, checklistItemId])
  @@index([tenantId, assetId])
}

model PropertyChecklistItem {
  // ... campos existentes ...
  checklistItemAssets ChecklistItemAsset[]
}
```

**Migración requerida:** Sí (nueva tabla)

---

**Opción B: Metadata JSON (NO RECOMENDADO)**

**Justificación para NO usar:**
- ❌ Queries menos eficientes (no se puede indexar fácilmente)
- ❌ Validaciones más complejas (no hay constraints únicos)
- ❌ Batch queries más difíciles (requiere parsing JSON)
- ❌ Menos escalable (agregar metadata requiere cambios de schema)

**Conclusión:** Opción A (tabla propia) es la correcta, alineada con Inventario.

### 11.2 Bucket de Storage

**Recomendación:** Nuevo bucket `checklist-item-images`

**Justificación:**
- Separación clara de contextos (inventario vs checklist)
- Políticas de acceso independientes en Supabase
- Facilita cleanup y gestión
- No afecta performance (mismo proveedor)

**Alternativa:** Mismo bucket con paths diferentes
- Funciona pero menos claro
- Paths más largos
- Mezcla contextos en mismo bucket

**Conclusión:** Nuevo bucket `checklist-item-images` es preferible.

### 11.3 Path Template

**Recomendado:**
```
{tenantId}/checklist-items/{checklistItemId}/{groupId}/original.{ext}
{tenantId}/checklist-items/{checklistItemId}/{groupId}/thumb_256.{format}
```

**Justificación:**
- Consistente con inventario (mismo patrón)
- `checklist-items` diferencia contexto
- Misma estructura permite reutilizar lógica de paths

---

## 12. Resumen de Archivos Clave

### 12.1 Modelo de Datos
- `prisma/schema.prisma` (líneas 882-897): `InventoryItemAsset`
- `prisma/schema.prisma` (líneas 840-877): `Asset`
- `prisma/migrations/20250122000000_add_inventory_item_asset/migration.sql`: Migración inicial

### 12.2 Storage
- `lib/storage/index.ts`: Export default provider
- `lib/storage/supabaseStorage.ts`: Implementación Supabase
- `lib/storage/types.ts`: Interfaces TypeScript

### 12.3 Helpers
- `lib/media/thumbnail.ts`: Generación de thumbnails
- `lib/media/getInventoryItemImageThumbs.ts`: Obtención de thumbs (single + batch)

### 12.4 Server Actions
- `app/host/inventory/image-actions.ts`: Upload y delete de imágenes

### 12.5 UI Components
- `app/host/properties/[id]/inventory/InventoryItemImageSlots.tsx`: Componente principal
- `app/host/properties/[id]/inventory/AddItemPhotosModal.tsx`: Modal de gestión
- `app/host/properties/[id]/inventory/InventoryList.tsx`: Integración en lista

### 12.6 Pages
- `app/host/properties/[id]/inventory/page.tsx`: SSR con batch query

---

## 13. Conclusión

**Para implementar imágenes en Tareas de Checklist:**

1. **Crear tabla `ChecklistItemAsset`** (similar a `InventoryItemAsset`)
2. **Crear bucket `checklist-item-images`** en Supabase
3. **Crear server actions** en `app/host/properties/checklist-image-actions.ts`
4. **Crear helper** `getChecklistItemImageThumbs` (similar a inventario)
5. **Reutilizar componentes UI** con cambios mínimos (renombrar props)
6. **Mantener todas las validaciones** de seguridad (tenant-scope, ownership, tipos, tamaño)
7. **Usar mismo patrón de Transaction** (atomicidad storage + DB)
8. **Implementar batch queries** en SSR para performance

**Ventajas de este enfoque:**
- ✅ Consistencia arquitectónica total con Inventario
- ✅ Reutilización máxima de código existente
- ✅ Mismas garantías de seguridad y performance
- ✅ Fácil mantenimiento (mismos patrones)

**Riesgos mitigados:**
- ✅ Multi-tenant: Validaciones estrictas copiadas
- ✅ Performance: Batch queries en SSR
- ✅ Atomicidad: Transactions garantizadas
- ✅ Cleanup: Manejo de errores robusto

---

**Fin del análisis**

