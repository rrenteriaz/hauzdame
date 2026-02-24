-- Migración correctiva: Fix constraints y baseline de PropertyChecklistItem
-- Objetivo: Hacer las migraciones posteriores compatibles con shadow DB cuando PropertyChecklistItem
-- fue creada antes (en 20250121000000_create_property_checklist_item)
-- 
-- Esta migración se ejecuta ANTES de phase4_switch_property_pk para asegurar que las FKs
-- se eliminen correctamente antes de intentar hacer DROP CONSTRAINT Property_pkey
--
-- NOTA: Esta migración es idempotente y puede ejecutarse múltiples veces sin problemas

-- ============================================
-- PARTE 1: Preparar para phase4_switch_property_pk
-- ============================================
-- Eliminar FKs que pueden existir y que causarían problemas al hacer DROP CONSTRAINT Property_pkey
-- Estas FKs se recrearán después de que phase4 complete el cambio de PK

-- Eliminar FK de InventoryCheck si existe (puede no estar en la migración phase4 original)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'InventoryCheck_propertyId_fkey' 
    AND table_name = 'InventoryCheck'
  ) THEN
    ALTER TABLE "InventoryCheck" DROP CONSTRAINT "InventoryCheck_propertyId_fkey";
  END IF;
END $$;

-- Eliminar FK de PropertyChecklistItem si existe (creada en 20250121000000)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'PropertyChecklistItem_propertyId_fkey' 
    AND table_name = 'PropertyChecklistItem'
  ) THEN
    ALTER TABLE "PropertyChecklistItem" DROP CONSTRAINT "PropertyChecklistItem_propertyId_fkey";
  END IF;
END $$;

-- ============================================
-- PARTE 2: Preparar para fix_user_columns_for_import
-- ============================================
-- Asegurar que enum ChecklistArea se cree de forma idempotente
-- (la tabla PropertyChecklistItem ya se maneja en PARTE 1)

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

-- Crear FKs si no existen (se recrearán después de phase4)
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

