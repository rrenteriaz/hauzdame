-- CreateTable: Tabla de relación entre InventoryItem y Asset (imágenes del item)
-- Permite 1-3 imágenes por item, ordenadas por posición (1, 2, 3)
CREATE TABLE IF NOT EXISTS "InventoryItemAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItemAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Índice para búsquedas por tenant e item
CREATE INDEX IF NOT EXISTS "InventoryItemAsset_tenantId_itemId_idx" ON "InventoryItemAsset"("tenantId", "itemId");

-- CreateIndex: Índice para búsquedas por tenant y asset
CREATE INDEX IF NOT EXISTS "InventoryItemAsset_tenantId_assetId_idx" ON "InventoryItemAsset"("tenantId", "assetId");

-- CreateUniqueConstraint: Máximo 1 imagen por slot de posición (1-3) por item
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItemAsset_tenantId_itemId_position_key" ON "InventoryItemAsset"("tenantId", "itemId", "position");

-- CreateUniqueConstraint: Evitar duplicados (mismo asset en el mismo item)
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItemAsset_tenantId_itemId_assetId_key" ON "InventoryItemAsset"("tenantId", "itemId", "assetId");

-- AddForeignKey: Relación con Tenant (onDelete: Cascade)
ALTER TABLE "InventoryItemAsset" ADD CONSTRAINT "InventoryItemAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Relación con InventoryItem (onDelete: Cascade)
ALTER TABLE "InventoryItemAsset" ADD CONSTRAINT "InventoryItemAsset_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Relación con Asset (onDelete: Cascade)
ALTER TABLE "InventoryItemAsset" ADD CONSTRAINT "InventoryItemAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

