-- AlterTable: Agregar archivedAt a InventoryItem (nullable, sin default)
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- AlterTable: Agregar isActive a InventoryLine (NOT NULL con default true)
-- Si la tabla tiene filas existentes, PostgreSQL aplicará el DEFAULT automáticamente
ALTER TABLE "InventoryLine" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex: Índice compuesto para búsquedas eficientes de catálogo activo
CREATE INDEX IF NOT EXISTS "InventoryItem_tenantId_category_archivedAt_idx" ON "InventoryItem"("tenantId", "category", "archivedAt");

-- CreateIndex: Índice para filtrar líneas activas
CREATE INDEX IF NOT EXISTS "InventoryLine_isActive_idx" ON "InventoryLine"("isActive");
