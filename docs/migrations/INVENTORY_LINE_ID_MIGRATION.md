# Migración: inventoryLineId en InventoryReviewItemChange e InventoryReport

**Objetivo:** Asociar cambios y reportes de inventario a la línea específica (área) donde ocurrieron.

---

## 1. Cambios en el schema Prisma

### 1.1 Modelo InventoryLine

Añadir relaciones inversas:

```prisma
model InventoryLine {
  // ... campos existentes ...
  inventoryChecks        InventoryCheck[]
  inventoryReviewItemChanges InventoryReviewItemChange[]  // NUEVO
  inventoryReports       InventoryReport[]                 // NUEVO
}
```

### 1.2 Modelo InventoryReviewItemChange

Añadir campo y relación:

```prisma
model InventoryReviewItemChange {
  id              String                @id @default(cuid())
  tenantId        String
  reviewId        String
  itemId          String
  inventoryLineId String?               // NUEVO - nullable para datos legacy
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
  inventoryLine   InventoryLine?        @relation(fields: [inventoryLineId], references: [id], onDelete: SetNull)  // NUEVO
  tenant          Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([reviewId])
  @@index([itemId])
  @@index([inventoryLineId])  // NUEVO
  @@index([status])
}
```

### 1.3 Modelo InventoryReport

Añadir campo y relación:

```prisma
model InventoryReport {
  id                String                     @id @default(cuid())
  tenantId          String
  reviewId          String?
  cleaningId        String?
  itemId            String
  inventoryLineId   String?                    // NUEVO - nullable para datos legacy
  type              InventoryReportType
  severity          InventoryReportSeverity    @default(INFO)
  description       String?
  status            InventoryReportStatus     @default(PENDING)
  managerResolution InventoryReportResolution?
  createdByUserId   String
  resolvedByUserId  String?
  createdAt         DateTime                   @default(now())
  updatedAt         DateTime                  @updatedAt
  resolvedAt        DateTime?
  evidence          InventoryEvidence[]
  cleaning          Cleaning?                  @relation(fields: [cleaningId], references: [id])
  createdBy         User                       @relation("InventoryReportCreator", fields: [createdByUserId], references: [id])
  item              InventoryItem              @relation(fields: [itemId], references: [id], onDelete: Cascade)
  resolvedBy        User?                      @relation("InventoryReportResolver", fields: [resolvedByUserId], references: [id])
  review            InventoryReview?           @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  inventoryLine     InventoryLine?             @relation(fields: [inventoryLineId], references: [id], onDelete: SetNull)  // NUEVO
  tenant            Tenant                     @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([reviewId])
  @@index([cleaningId])
  @@index([itemId])
  @@index([inventoryLineId])  // NUEVO
  @@index([status])
  @@index([createdByUserId])
}
```

**Nota:** `onDelete: SetNull` – Si se elimina la línea, el cambio/reporte conserva el historial con `inventoryLineId = null` (fallback a comportamiento por item).

---

## 2. Archivo de migración SQL

**Ruta:** `prisma/migrations/YYYYMMDDHHMMSS_add_inventory_line_id_to_changes_reports/migration.sql`

```sql
-- AlterTable
ALTER TABLE "InventoryReviewItemChange" ADD COLUMN "inventoryLineId" TEXT;

-- AlterTable
ALTER TABLE "InventoryReport" ADD COLUMN "inventoryLineId" TEXT;

-- CreateIndex
CREATE INDEX "InventoryReviewItemChange_inventoryLineId_idx" ON "InventoryReviewItemChange"("inventoryLineId");

-- CreateIndex
CREATE INDEX "InventoryReport_inventoryLineId_idx" ON "InventoryReport"("inventoryLineId");

-- AddForeignKey
ALTER TABLE "InventoryReviewItemChange" ADD CONSTRAINT "InventoryReviewItemChange_inventoryLineId_fkey" FOREIGN KEY ("inventoryLineId") REFERENCES "InventoryLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_inventoryLineId_fkey" FOREIGN KEY ("inventoryLineId") REFERENCES "InventoryLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

---

## 3. Orden de ejecución recomendado

1. Crear el archivo de migración en `prisma/migrations/`.
2. Actualizar `prisma/schema.prisma` con los nuevos campos y relaciones.
3. Ejecutar `npx prisma migrate dev --name add_inventory_line_id_to_changes_reports`.
4. Verificar que `npx prisma generate` actualice el cliente.

---

## 4. Datos existentes (legacy)

| Situación | inventoryLineId | Comportamiento en UI |
|-----------|-----------------|----------------------|
| Registros creados antes de la migración | `null` | Icono en la primera línea que coincida por `itemId` (o en todas, según fallback definido) |
| Registros nuevos | ID de la línea | Icono solo en la línea correspondiente |

---

## 5. Validaciones a considerar

- Al crear cambio/reporte: `inventoryLineId` debe pertenecer a una línea del mismo `itemId` y `propertyId` que la revisión.
- La línea debe existir y estar activa (`isActive = true`) en el momento de crear el reporte.
