-- AlterTable: Agregar campos de variantes a InventoryLine
ALTER TABLE "InventoryLine" ADD COLUMN "variantKey" TEXT;
ALTER TABLE "InventoryLine" ADD COLUMN "variantValue" TEXT;
ALTER TABLE "InventoryLine" ADD COLUMN "variantValueNormalized" TEXT;

-- AlterTable: Agregar defaultVariantKey a InventoryItem
ALTER TABLE "InventoryItem" ADD COLUMN "defaultVariantKey" TEXT;

-- DropIndex: Eliminar el unique constraint anterior
DROP INDEX IF EXISTS "InventoryLine_propertyId_areaNormalized_itemId_key";

-- CreateIndex: Crear nuevo unique constraint que incluye variantes
CREATE UNIQUE INDEX "InventoryLine_propertyId_areaNormalized_itemId_variantKey_variantValueNormalized_key" ON "InventoryLine"("propertyId", "areaNormalized", "itemId", "variantKey", "variantValueNormalized");

