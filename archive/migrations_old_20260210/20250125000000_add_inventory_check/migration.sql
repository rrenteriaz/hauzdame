-- CreateEnum
CREATE TYPE "InventoryCheckStatus" AS ENUM ('OK', 'MISSING', 'DAMAGED');

-- CreateTable
CREATE TABLE "InventoryCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "cleaningId" TEXT NOT NULL,
    "inventoryLineId" TEXT NOT NULL,
    "status" "InventoryCheckStatus" NOT NULL DEFAULT 'OK',
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryCheck_tenantId_idx" ON "InventoryCheck"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryCheck_cleaningId_idx" ON "InventoryCheck"("cleaningId");

-- CreateIndex
CREATE INDEX "InventoryCheck_propertyId_idx" ON "InventoryCheck"("propertyId");

-- CreateIndex
CREATE INDEX "InventoryCheck_inventoryLineId_idx" ON "InventoryCheck"("inventoryLineId");

-- CreateIndex
CREATE INDEX "InventoryCheck_status_idx" ON "InventoryCheck"("status");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "InventoryCheck_cleaningId_inventoryLineId_key" ON "InventoryCheck"("cleaningId", "inventoryLineId");

-- AddForeignKey
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_inventoryLineId_fkey" FOREIGN KEY ("inventoryLineId") REFERENCES "InventoryLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

