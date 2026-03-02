-- AlterTable
ALTER TABLE "InventoryReviewItemChange" ADD COLUMN "inventoryLineId" TEXT;

-- AlterTable
ALTER TABLE "InventoryReport" ADD COLUMN "inventoryLineId" TEXT;

-- CreateIndex
CREATE INDEX "InventoryReviewItemChange_reviewId_inventoryLineId_idx" ON "InventoryReviewItemChange"("reviewId", "inventoryLineId");

-- CreateIndex
CREATE INDEX "InventoryReport_reviewId_inventoryLineId_idx" ON "InventoryReport"("reviewId", "inventoryLineId");

-- AddForeignKey
ALTER TABLE "InventoryReviewItemChange" ADD CONSTRAINT "InventoryReviewItemChange_inventoryLineId_fkey" FOREIGN KEY ("inventoryLineId") REFERENCES "InventoryLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReport" ADD CONSTRAINT "InventoryReport_inventoryLineId_fkey" FOREIGN KEY ("inventoryLineId") REFERENCES "InventoryLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
