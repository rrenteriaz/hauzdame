-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('FURNITURE_EQUIPMENT', 'LINENS', 'TABLEWARE_UTENSILS', 'DECOR', 'KITCHEN_ACCESSORIES', 'KEYS_ACCESS', 'CONSUMABLES', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'DAMAGED');

-- CreateEnum
CREATE TYPE "InventoryPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'CRITICAL');

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "defaultBrand" TEXT,
    "defaultModel" TEXT,
    "defaultColor" TEXT,
    "defaultSize" TEXT,
    "isReplacable" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "areaNormalized" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "condition" "InventoryCondition" NOT NULL DEFAULT 'GOOD',
    "priority" "InventoryPriority" NOT NULL DEFAULT 'NORMAL',
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "color" TEXT,
    "size" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_idx" ON "InventoryItem"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_category_idx" ON "InventoryItem"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_tenantId_category_nameNormalized_key" ON "InventoryItem"("tenantId", "category", "nameNormalized");

-- CreateIndex
CREATE INDEX "InventoryLine_tenantId_propertyId_idx" ON "InventoryLine"("tenantId", "propertyId");

-- CreateIndex
CREATE INDEX "InventoryLine_propertyId_areaNormalized_idx" ON "InventoryLine"("propertyId", "areaNormalized");

-- CreateIndex
CREATE INDEX "InventoryLine_propertyId_itemId_idx" ON "InventoryLine"("propertyId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLine_propertyId_areaNormalized_itemId_key" ON "InventoryLine"("propertyId", "areaNormalized", "itemId");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLine" ADD CONSTRAINT "InventoryLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLine" ADD CONSTRAINT "InventoryLine_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLine" ADD CONSTRAINT "InventoryLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

