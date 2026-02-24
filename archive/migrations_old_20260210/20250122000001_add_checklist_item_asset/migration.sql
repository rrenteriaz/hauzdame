-- CreateTable: Tabla de relación entre PropertyChecklistItem y Asset (imágenes de la tarea)
-- Permite 1-3 imágenes por tarea, ordenadas por posición (1, 2, 3)
CREATE TABLE IF NOT EXISTS "ChecklistItemAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItemAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Índice para búsquedas por tenant e item
CREATE INDEX IF NOT EXISTS "ChecklistItemAsset_tenantId_checklistItemId_idx" ON "ChecklistItemAsset"("tenantId", "checklistItemId");

-- CreateIndex: Índice para búsquedas por tenant y asset
CREATE INDEX IF NOT EXISTS "ChecklistItemAsset_tenantId_assetId_idx" ON "ChecklistItemAsset"("tenantId", "assetId");

-- CreateUniqueConstraint: Máximo 1 imagen por slot de posición (1-3) por tarea
CREATE UNIQUE INDEX IF NOT EXISTS "ChecklistItemAsset_tenantId_checklistItemId_position_key" ON "ChecklistItemAsset"("tenantId", "checklistItemId", "position");

-- CreateUniqueConstraint: Evitar duplicados (mismo asset en la misma tarea)
CREATE UNIQUE INDEX IF NOT EXISTS "ChecklistItemAsset_tenantId_checklistItemId_assetId_key" ON "ChecklistItemAsset"("tenantId", "checklistItemId", "assetId");

DO $$ BEGIN
  ALTER TABLE "ChecklistItemAsset"
    ADD CONSTRAINT "ChecklistItemAsset_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChecklistItemAsset"
    ADD CONSTRAINT "ChecklistItemAsset_checklistItemId_fkey"
    FOREIGN KEY ("checklistItemId") REFERENCES "PropertyChecklistItem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChecklistItemAsset"
    ADD CONSTRAINT "ChecklistItemAsset_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
