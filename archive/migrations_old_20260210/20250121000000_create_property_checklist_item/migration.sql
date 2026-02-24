-- CreateEnum: ChecklistArea (si no existe)
DO $$ BEGIN
  CREATE TYPE "ChecklistArea" AS ENUM ('SALA', 'COMEDOR', 'COCINA', 'HABITACIONES', 'BANOS', 'PATIO', 'JARDIN', 'COCHERA', 'OTROS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: PropertyChecklistItem
-- Esta tabla debe existir antes de que ChecklistItemAsset intente crear FK a ella
CREATE TABLE IF NOT EXISTS "PropertyChecklistItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "area" "ChecklistArea" NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requiresValue" BOOLEAN NOT NULL DEFAULT false,
    "valueLabel" TEXT,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "PropertyChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Índices para búsquedas comunes
CREATE INDEX IF NOT EXISTS "PropertyChecklistItem_tenantId_idx" ON "PropertyChecklistItem"("tenantId");
CREATE INDEX IF NOT EXISTS "PropertyChecklistItem_propertyId_idx" ON "PropertyChecklistItem"("propertyId");
CREATE INDEX IF NOT EXISTS "PropertyChecklistItem_propertyId_isActive_idx" ON "PropertyChecklistItem"("propertyId", "isActive");

-- AddForeignKey: tenantId -> Tenant
DO $$ BEGIN
  ALTER TABLE "PropertyChecklistItem"
    ADD CONSTRAINT "PropertyChecklistItem_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: propertyId -> Property
DO $$ BEGIN
  ALTER TABLE "PropertyChecklistItem"
    ADD CONSTRAINT "PropertyChecklistItem_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

