# Informe Técnico — Estado Actual del Módulo de Inventario

**Fecha:** 2026-02-10  
**Objetivo:** Documentar el estado actual del sistema de Inventario para implementar soporte correcto de variantes sin romper dominio ni checklist.  
**Alcance:** Solo documentación — sin cambios de código, migraciones ni propuestas.

---

## 1) PRISMA SCHEMA (copiar textual)

### InventoryItem

```prisma
/// *
/// * Ítem de inventario (catálogo reutilizable por tenant).
model InventoryItem {
  id                         String                      @id @default(cuid())
  tenantId                   String
  category                   InventoryCategory
  name                       String
  nameNormalized             String
  defaultBrand               String?
  defaultModel               String?
  defaultColor               String?
  defaultSize                String?
  isReplacable               Boolean?                    @default(true)
  createdAt                  DateTime                    @default(now())
  updatedAt                  DateTime                    @updatedAt
  defaultVariantKey          String?
  defaultVariantLabel        String?
  defaultVariantOptions      Json?
  archivedAt                 DateTime?
  tenant                     Tenant                      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  inventoryItemAssets        InventoryItemAsset[]
  inventoryLines             InventoryLine[]
  inventoryReports           InventoryReport[]
  inventoryReviewItemChanges InventoryReviewItemChange[]
  inventoryChecks            InventoryCheck[]

  @@unique([tenantId, nameNormalized])
  @@index([tenantId])
  @@index([tenantId, category])
  @@index([tenantId, category, archivedAt])
}
```

### InventoryLine

```prisma
/// *
/// * Línea de inventario en una propiedad/área específica.
model InventoryLine {
  id                     String             @id @default(cuid())
  tenantId               String
  propertyId             String
  area                   String
  areaNormalized         String
  itemId                 String
  expectedQty            Int
  condition              InventoryCondition @default(USED_LT_1Y)
  priority               InventoryPriority  @default(MEDIUM)
  brand                  String?
  model                  String?
  serialNumber           String?
  color                  String?
  size                   String?
  notes                  String?
  createdAt              DateTime           @default(now())
  updatedAt              DateTime           @updatedAt
  variantKey             String?
  variantValue           String?
  variantValueNormalized String?
  isActive               Boolean            @default(true)
  item                   InventoryItem      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  property               Property           @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  tenant                 Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  inventoryChecks        InventoryCheck[]

  @@unique([propertyId, areaNormalized, itemId, variantKey, variantValueNormalized])
  @@index([tenantId, propertyId])
  @@index([propertyId, areaNormalized])
  @@index([propertyId, itemId])
}
```

### GlobalCatalogItem

```prisma
/// *
/// * Catálogo Global de Ítems (fuente única de verdad para autocomplete).
/// * No es modificable por usuarios; se actualiza mediante seeds.
model GlobalCatalogItem {
  id             String   @id @default(cuid())
  locale         String   @default("es-MX")
  name           String
  nameNormalized String
  defaultCategory String? // InventoryCategory como string (puede ser null)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([locale, nameNormalized])
  @@index([locale, isActive])
  @@index([nameNormalized])
}
```

### InventoryCheck

```prisma
/// *
/// * Verificación rápida de inventario por item durante una limpieza.
/// * Permite marcar cada item como OK / MISSING / DAMAGED sin crear una revisión completa.
model InventoryCheck {
  id                String               @id @default(cuid())
  tenantId          String
  propertyId        String
  cleaningId        String
  inventoryLineId   String
  status            InventoryCheckStatus @default(OK)
  note              String?
  createdByUserId   String?
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  inventoryItemId   String?
  cleaning          Cleaning             @relation("CleaningInventoryChecks", fields: [cleaningId], references: [id], onDelete: Cascade)
  property          Property             @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  inventoryLine     InventoryLine        @relation(fields: [inventoryLineId], references: [id], onDelete: Cascade)
  tenant            Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdBy         User?                @relation("InventoryCheckCreator", fields: [createdByUserId], references: [id])
  inventoryItem     InventoryItem?       @relation(fields: [inventoryItemId], references: [id])

  @@unique([cleaningId, inventoryLineId])
  @@index([tenantId])
  @@index([cleaningId])
  @@index([propertyId])
  @@index([inventoryLineId])
  @@index([status])
}
```

### InventoryReview

```prisma
/// *
/// * Revisión de inventario realizada por un Cleaner durante una limpieza.
/// * Una limpieza solo puede tener una revisión (1:1).
model InventoryReview {
  id               String                      @id @default(cuid())
  tenantId         String
  cleaningId       String                      @unique
  propertyId       String
  reviewedByUserId String?
  status           InventoryReviewStatus       @default(DRAFT)
  submittedAt      DateTime?
  approvedAt       DateTime?
  rejectedAt       DateTime?
  resolvedAt       DateTime?
  notes            String?
  createdAt        DateTime                    @default(now())
  updatedAt        DateTime                    @updatedAt
  reports          InventoryReport[]
  cleaning         Cleaning                    @relation(fields: [cleaningId], references: [id], onDelete: Cascade)
  property         Property                    @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  reviewedBy       User?                       @relation("InventoryReviewer", fields: [reviewedByUserId], references: [id])
  tenant           Tenant                      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  itemChanges      InventoryReviewItemChange[]

  @@index([tenantId])
  @@index([cleaningId])
  @@index([propertyId])
  @@index([status])
  @@index([reviewedByUserId])
}
```

### InventoryReviewItemChange

```prisma
/// *
/// * Cambio de cantidad propuesto por el Cleaner durante la revisión.
model InventoryReviewItemChange {
  id              String                @id @default(cuid())
  tenantId        String
  reviewId        String
  itemId          String
  quantityBefore  Int
  quantityAfter   Int
  reason          InventoryChangeReason
  reasonOtherText String?
  note            String?               @db.VarChar(200)
  status          InventoryChangeStatus @default(PENDING)
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
  evidence        InventoryEvidence[]
  item            InventoryItem         @relation(fields: [itemId], references: [id], onDelete: Cascade)
  review          InventoryReview       @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  tenant          Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([reviewId])
  @@index([itemId])
  @@index([status])
}
```

### InventoryReport

```prisma
/// *
/// * Reporte de incidencia sobre un item del inventario.
model InventoryReport {
  id                String                     @id @default(cuid())
  tenantId          String
  reviewId          String?
  cleaningId        String?
  itemId            String
  type              InventoryReportType
  severity          InventoryReportSeverity    @default(INFO)
  description       String?
  status            InventoryReportStatus      @default(PENDING)
  managerResolution InventoryReportResolution?
  createdByUserId   String
  resolvedByUserId  String?
  createdAt         DateTime                   @default(now())
  updatedAt         DateTime                   @updatedAt
  resolvedAt        DateTime?
  evidence          InventoryEvidence[]
  cleaning          Cleaning?                  @relation(fields: [cleaningId], references: [id])
  createdBy         User                       @relation("InventoryReportCreator", fields: [createdByUserId], references: [id])
  item              InventoryItem              @relation(fields: [itemId], references: [id], onDelete: Cascade)
  resolvedBy        User?                      @relation("InventoryReportResolver", fields: [resolvedByUserId], references: [id])
  review            InventoryReview?           @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  tenant            Tenant                     @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([reviewId])
  @@index([cleaningId])
  @@index([itemId])
  @@index([status])
  @@index([createdByUserId])
}
```

### PropertyChecklistItem

```prisma
/// *
/// * Checklist template por propiedad
/// * Define los items que deben completarse en cada limpieza de esta propiedad
model PropertyChecklistItem {
  id                  String               @id @default(cuid())
  tenantId            String
  area                ChecklistArea
  title               String
  sortOrder           Int                  @default(0)
  isActive            Boolean              @default(true)
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  requiresValue       Boolean              @default(false)
  valueLabel          String?
  propertyId          String
  property            Property             @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  tenant              Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  checklistItemAssets ChecklistItemAsset[]

  @@index([tenantId])
  @@index([propertyId])
  @@index([propertyId, isActive])
}
```

### CleaningChecklistItem

```prisma
/// *
/// * Checklist snapshot por limpieza
/// * Copia del checklist de la propiedad al momento de crear la limpieza
model CleaningChecklistItem {
  id                     String                  @id @default(cuid())
  tenantId               String
  cleaningId             String
  area                   ChecklistArea
  title                  String
  sortOrder              Int                     @default(0)
  isCompleted            Boolean                 @default(false)
  notCompletedReasonCode NotCompletedReasonCode?
  notCompletedReasonNote String?
  createdAt              DateTime                @default(now())
  updatedAt              DateTime                @updatedAt
  requiresValue          Boolean                 @default(false)
  valueLabel             String?
  valueNumber            Int?
  cleaning               Cleaning                @relation(fields: [cleaningId], references: [id], onDelete: Cascade)
  tenant                 Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([cleaningId])
  @@index([cleaningId, area])
}
```

### Modelos que NO existen en el schema

- **InventoryTemplateLine**: No existe. La plantilla se almacena en archivo JSON (`docs/templates/plantillaInventario.v1.0.json`).
- **PropertyInventory**: No existe. El inventario de la propiedad se modela como `InventoryLine` filtrado por `propertyId`.
- **bedSize**: No existe como campo. Se usa `variantKey: "bed_size"` + `variantValue` (ej: "Queen") en `InventoryLine`.
- **variantType**: No existe. Se usa `variantKey` (ej: "bed_size").
- **quantityExpected**: Se usa `expectedQty` en `InventoryLine`.
- **quantity**: Existe como `quantityBefore` y `quantityAfter` en `InventoryReviewItemChange`; no como campo directo en `InventoryLine` (que usa `expectedQty`).

---

## 2) FLUJO ACTUAL — CREACIÓN MANUAL

### Caso A: Usuario crea manualmente "Colcha Queen"

**Flujo (paso a paso):**

1. Usuario abre el wizard "Agregar ítem" (`AddInventoryItemWizard.tsx`).
2. Step 1: Busca en el **Catálogo Global** (`searchGlobalCatalogItemsAction`). Si selecciona "Colcha" del CG o escribe "Crear Colcha Queen", avanza.
3. Si selecciona del CG: se llama `ensureTenantCatalogItemFromGlobalAction` → busca/crea `InventoryItem` en el tenant por `(tenantId, nameNormalized)`.
4. Step 2: Selecciona área (ej: "Recámara 1").
5. Step 3: Si el item es variantable (Almohadas, Cama, Colchón según `lib/inventory-suggestions.ts`), se muestran opciones de `bed_size`. Usuario elige "Queen".
6. Step 4: Confirma. Se llama `createInventoryLineAction` con `FormData` que incluye:
   - `itemId` (o `itemName` si creó custom)
   - `area`
   - `category`
   - `expectedQty` (por defecto 1)
   - `variantKey`: "bed_size"
   - `variantValue`: "Queen" (o label como "Queen" que se normaliza a "queen")

**Tablas afectadas:**

| Tabla          | Registros | Campos relevantes                                                                                                                                 |
|----------------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| InventoryItem  | 0 o 1     | Si viene del CG: ya existe o se crea. Si custom: se crea con `name`, `nameNormalized`, `category`, opcionalmente `defaultVariantKey`, `defaultVariantOptions`. |
| InventoryLine  | 1         | `propertyId`, `area`, `areaNormalized`, `itemId`, `expectedQty` (cantidad), `variantKey`: "bed_size", `variantValue`: "Queen", `variantValueNormalized`: "queen" |

**Dónde se guarda el tamaño:** En `InventoryLine.variantKey` = "bed_size" y `InventoryLine.variantValue` = "Queen" (o label), `InventoryLine.variantValueNormalized` = "queen" (normalizado).

**Dónde se guarda quantityExpected:** En `InventoryLine.expectedQty`.

**Nota:** `InventoryItem` puede tener `defaultVariantKey` y `defaultVariantOptions` si el item fue creado con variantes; para "Colcha" desde CG, el CG no define variantes, pero `isBedSizeVariantable("Colcha")` en el frontend decide si mostrar el selector de `bed_size`. Si el usuario elige "Queen", se envía en el FormData y termina en `InventoryLine`.

---

## 3) FLUJO ACTUAL — APLICAR PLANTILLA

### Caso B: Se aplica plantilla que incluye "Colcha"

**Origen de datos:** Archivo `docs/templates/plantillaInventario.v1.0.json` (no hay tabla de plantilla).

**Estructura de la plantilla para Colcha (segmento real):**

```json
{
  "item": {
    "category": "LINENS",
    "name": "Colcha",
    "defaultVariantKey": null,
    "defaultVariantLabel": null,
    "defaultVariantOptions": null
  },
  "lines": [
    {
      "area": "Recámara 2",
      "expectedQty": 1,
      "variantKey": null,
      "variantValue": null,
      ...
    },
    {
      "area": "Recámara 1",
      "expectedQty": 1,
      "color": "Gris",
      "variantKey": null,
      "variantValue": null,
      ...
    }
  ]
}
```

**Flujo (`applyInventoryTemplateToProperty` en `template-actions.ts`):**

1. Carga el JSON de la plantilla.
2. Construye un map de items de catálogo por `nameNormalized` (sin `category`).
3. **Find-or-create InventoryItem:** Busca por `tenantId` + `nameNormalized`. Si no existe, crea. Si existe, reutiliza (se conserva categoría original).
4. **OVERWRITE:** Elimina **todas** las `InventoryLine` de la propiedad.
5. **Crear InventoryLine:** Por cada línea de la plantilla, crea `InventoryLine` con `createMany`, incluyendo:
   - `variantKey`, `variantValue`, `variantValueNormalized` tal como vienen en la plantilla.

**Tablas afectadas:**

| Tabla         | Registros | Detalle                                                                 |
|---------------|-----------|-------------------------------------------------------------------------|
| InventoryItem | 0 o N     | Find-or-create por `nameNormalized`. Para "Colcha" suele reutilizarse o crearse 1. |
| InventoryLine | N         | Una por cada `(area, item, variantKey, variantValue)` de la plantilla. |

**Para Colcha en la plantilla actual:**

- `variantKey`: null
- `variantValue`: null  
No se guarda variante. Se crean 2 líneas (Recámara 1 y Recámara 2) con `expectedQty: 1` cada una.

**Si el item queda editable:** Sí. Las `InventoryLine` y `InventoryItem` se editan por la UI de inventario. Al volver a aplicar la plantilla, se hace OVERWRITE: se borran todas las líneas y se recrean desde la plantilla.

---

## 4) RELACIÓN CON CHECKLIST

**Modelos del checklist de limpieza:**

- **PropertyChecklistItem:** Template por propiedad (`area`, `title`, `sortOrder`, etc.). Definido por el host.
- **CleaningChecklistItem:** Snapshot por limpieza, copia de `PropertyChecklistItem` al crear la limpieza. Incluye `area`, `title`, `isCompleted`, etc.

**Dependencia con inventario:**

- El checklist **no** usa `InventoryItem` ni `InventoryLine`.
- Son sistemas separados:
  - Checklist: tareas de limpieza (ej: "Limpiar ventanas", "Revisar baño").
  - Inventario: objetos/ítems de la propiedad (ej: "Colcha", "Toalla").

**Inventario durante la limpieza:**

- **InventoryCheck:** Relaciona `Cleaning` con `InventoryLine`. El Cleaner verifica cada línea (OK / MISSING / DAMAGED).
- **getInventoryForCleaning:** Obtiene `InventoryLine` activas de la propiedad y los checks existentes para esa limpieza.
- Se muestra como `InventoryPreviewCard` / `InventoryVerificationClient` en la vista de la limpieza.

**Supuestos sobre cantidades:**

- Cada `InventoryLine` tiene una sola cantidad: `expectedQty`.
- No hay agregación de cantidades por item; cada combinación `(área, item, variante)` es una línea distinta.

**Dependencia con bedSize:**

- No hay lógica que exija `bed_size` en el checklist.
- El checklist no conoce variantes; trabaja con `PropertyChecklistItem` y `CleaningChecklistItem`, que no tienen campos de variante ni relación con inventario.

---

## 5) CONSTRAINTS IMPORTANTES

### Unique constraints

| Modelo         | Constraint                                                                 | Notas                                                                 |
|----------------|----------------------------------------------------------------------------|-----------------------------------------------------------------------|
| InventoryItem | `@@unique([tenantId, nameNormalized])`                                    | Sin `category`. Un item por `(tenantId, nameNormalized)`.             |
| InventoryLine  | `@@unique([propertyId, areaNormalized, itemId, variantKey, variantValueNormalized])` | Duplicado = misma propiedad, área, ítem y firma de variante.          |
| GlobalCatalogItem | `@@unique([locale, nameNormalized])`                                  | Por locale.                                                           |
| InventoryCheck | `@@unique([cleaningId, inventoryLineId])`                               | Un check por línea por limpieza.                                      |

**No existen:**

- `(tenantId, name)` — se usa `nameNormalized`.
- `(inventoryItemId, bedSize)` — no hay campo `bedSize`; la variante va en `InventoryLine` con `variantKey` + `variantValueNormalized`.

### Índices relevantes

- `InventoryItem`: `[tenantId]`, `[tenantId, category]`, `[tenantId, category, archivedAt]`
- `InventoryLine`: `[tenantId, propertyId]`, `[propertyId, areaNormalized]`, `[propertyId, itemId]`
- `InventoryCheck`: `[cleaningId]`, `[inventoryLineId]`, `[propertyId]`, `[status]`

### Validaciones backend relacionadas con variantes

- En `createInventoryLineAction` / `updateInventoryLineAction`: si hay `variantKey`, debe haber `variantValue`.
- En `checkDuplicateInventoryLine`: se usa `variantKey` y `variantValueNormalized` para detectar duplicados.
- En `createInventoryLine` (lib): si `variantKey === "bed_size"`, se evita duplicar información en `size` (se prioriza la variante).
- En `lib/inventory-suggestions.ts`: `isBedSizeVariantable` indica qué ítems muestran selector de `bed_size` (Almohadas, Cama, Colchón, Colcha).

---

## 6) CONCLUSIÓN TÉCNICA

### ¿Hoy el sistema soporta múltiples variantes por item?

Sí, de forma limitada. En `InventoryLine`:
- `variantKey` y `variantValue` permiten una única variante por línea.
- El constraint único incluye `variantKey` y `variantValueNormalized`, así que la misma combinación `(propertyId, area, itemId, variantKey, variantValue)` solo puede existir una vez.
- Ejemplo: "Colcha Queen" y "Colcha King" son dos líneas distintas para el mismo `InventoryItem`.

No hay soporte para varias variantes en una sola línea (ej: `bed_size` + `material` en la misma línea). Solo una variante por línea.

### ¿El tamaño está modelado como propiedad simple o como entidad?

Como propiedad de la línea:
- `variantKey`: "bed_size"
- `variantValue`: valor mostrado (ej: "Queen")
- `variantValueNormalized`: valor normalizado (ej: "queen")

No hay entidad separada. No existe `bedSize` como campo; se usa el par `variantKey`/`variantValue`.

### ¿Convertir un item simple en variantable rompería algo?

Riesgos y dependencias:

1. **Constraint único:** Ya contempla variantes. Añadir variantes a un ítem que antes no las tenía no rompe el constraint.
2. **Datos existentes:** Líneas sin variante (`variantKey`/`variantValue` null) seguirían válidas. Las nuevas podrían usar variantes.
3. **Duplicados:** Si hoy hay "Colcha" en Recámara 1 sin variante y se decide que Colcha es variantable, una nueva "Colcha Queen" en Recámara 1 sería otra línea. La "Colcha" sin variante seguiría existiendo como línea distinta.
4. **Plantilla:** La plantilla actual para Colcha usa `variantKey: null`. Si se cambia a variantable en la plantilla, habría que definir variantes por área o conservar líneas sin variante.
5. **Checklist:** No depende de variantes; no se ve afectado.
6. **InventoryCheck:** Opera por `inventoryLineId`; cada línea (con o sin variante) es independiente. No se rompe.
7. **InventoryReviewItemChange:** Usa `itemId` (InventoryItem), no `inventoryLineId`. Cambiar a variantable no altera la estructura actual.

### ¿Qué dependencias serían sensibles?

- **UI:** `isBedSizeVariantable` y la lógica de sugerencias en `lib/inventory-suggestions.ts` — cualquier cambio de ítems variantables debe reflejarse ahí.
- **Plantilla JSON:** Si se agregan variantes, habría que actualizar la plantilla y el formato esperado en `template-actions.ts`.
- **Normalización:** `normalizeVariantValue` debe aplicarse de forma consistente para mantener la firma única.
- **GlobalCatalogItem:** No define variantes. Los items variantables se determinan en frontend/`inventory-suggestions.ts`, no en el CG.

---

*Fin del informe.*
