-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "defaultVariantLabel" TEXT,
ADD COLUMN IF NOT EXISTS "defaultVariantOptions" JSONB;

