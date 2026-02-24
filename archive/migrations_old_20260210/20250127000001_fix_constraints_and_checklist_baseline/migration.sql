-- Migración correctiva: Fix constraints y baseline de PropertyChecklistItem
-- Objetivo: Hacer las migraciones anteriores compatibles con shadow DB cuando PropertyChecklistItem
-- fue creada antes (en 20250121000000_create_property_checklist_item)

-- ============================================
-- PARTE 1: Fix para migración phase4_switch_property_pk
-- ============================================
-- Asegurar que InventoryCheck y PropertyChecklistItem se manejen correctamente
-- cuando se intenta hacer DROP CONSTRAINT Property_pkey

-- Eliminar FKs de InventoryCheck si existe (puede no estar en la migración original)
ALTER TABLE "InventoryCheck" DROP CONSTRAINT IF EXISTS "InventoryCheck_propertyId_fkey";

-- Eliminar FK de PropertyChecklistItem si existe (puede no estar en la migración original)
ALTER TABLE "PropertyChecklistItem" DROP CONSTRAINT IF EXISTS "PropertyChecklistItem_propertyId_fkey";

-- ============================================
-- PARTE 2: Fix para migración fix_user_columns_for_import
-- ============================================
-- Asegurar que enum ChecklistArea y tabla PropertyChecklistItem se creen de forma idempotente

-- Crear enum ChecklistArea si no existe (puede ya existir desde 20250121000000)
DO $$ BEGIN
  CREATE TYPE "ChecklistArea" AS ENUM ('SALA', 'COMEDOR', 'COCINA', 'HABITACIONES', 'BANOS', 'PATIO', 'JARDIN', 'COCHERA', 'OTROS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Crear tabla PropertyChecklistItem si no existe (puede ya existir desde 20250121000000)
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

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS "PropertyChecklistItem_tenantId_idx" ON "PropertyChecklistItem"("tenantId");
CREATE INDEX IF NOT EXISTS "PropertyChecklistItem_propertyId_idx" ON "PropertyChecklistItem"("propertyId");
CREATE INDEX IF NOT EXISTS "PropertyChecklistItem_propertyId_isActive_idx" ON "PropertyChecklistItem"("propertyId", "isActive");

-- Crear FKs si no existen
DO $$ BEGIN
  ALTER TABLE "PropertyChecklistItem" ADD CONSTRAINT "PropertyChecklistItem_propertyId_fkey" 
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PropertyChecklistItem" ADD CONSTRAINT "PropertyChecklistItem_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

