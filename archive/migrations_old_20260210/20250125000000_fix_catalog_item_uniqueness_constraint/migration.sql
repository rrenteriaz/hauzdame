-- Fix CatalogItem uniqueness constraint to align with CATALOG_ITEMS_V1 contract
-- Category is classification, not identity. Uniqueness is by (tenantId, nameNormalized) only.

-- Drop the old constraint that includes category
ALTER TABLE "InventoryItem" DROP CONSTRAINT IF EXISTS "InventoryItem_tenantId_category_nameNormalized_key";

-- Create the correct constraint without category
CREATE UNIQUE INDEX "InventoryItem_tenantId_nameNormalized_key" ON "InventoryItem"("tenantId", "nameNormalized");

