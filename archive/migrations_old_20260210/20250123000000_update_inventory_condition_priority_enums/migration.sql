-- Migración: Actualizar enums InventoryCondition e InventoryPriority
-- Mapeo de valores antiguos a nuevos sin perder datos

-- Asegurar que el enum tenga los nuevos valores antes de usarlos
ALTER TYPE "InventoryCondition" ADD VALUE IF NOT EXISTS 'USED_LT_1Y';
ALTER TYPE "InventoryCondition" ADD VALUE IF NOT EXISTS 'USED_GT_1Y';
ALTER TYPE "InventoryCondition" ADD VALUE IF NOT EXISTS 'NEW';

-- Agregar valores nuevos a InventoryPriority antes de usarlos
ALTER TYPE "InventoryPriority" ADD VALUE IF NOT EXISTS 'HIGH';
ALTER TYPE "InventoryPriority" ADD VALUE IF NOT EXISTS 'MEDIUM';
ALTER TYPE "InventoryPriority" ADD VALUE IF NOT EXISTS 'LOW';



-- Paso 1: Mapear InventoryCondition (solo si los valores antiguos existen)
-- GOOD -> USED_LT_1Y (más común, usado pero en buen estado)
-- FAIR -> USED_GT_1Y (usado y con más desgaste)
-- DAMAGED -> USED_GT_1Y (usado y con problemas)
-- NEW -> NEW (se mantiene)

DO $$ 
BEGIN
    -- Solo actualizar si existen registros con esos valores
    IF EXISTS (SELECT 1 FROM "InventoryLine" WHERE "condition"::text = 'GOOD' LIMIT 1) THEN
        UPDATE "InventoryLine" SET "condition" = 'USED_LT_1Y' WHERE "condition"::text = 'GOOD';
    END IF;
    
    IF EXISTS (SELECT 1 FROM "InventoryLine" WHERE "condition"::text = 'FAIR' LIMIT 1) THEN
        UPDATE "InventoryLine" SET "condition" = 'USED_GT_1Y' WHERE "condition"::text = 'FAIR';
    END IF;
    
    IF EXISTS (SELECT 1 FROM "InventoryLine" WHERE "condition"::text = 'DAMAGED' LIMIT 1) THEN
        UPDATE "InventoryLine" SET "condition" = 'USED_GT_1Y' WHERE "condition"::text = 'DAMAGED';
    END IF;
END $$;

-- Paso 2: Mapear InventoryPriority (solo si los valores antiguos existen)
-- NORMAL -> MEDIUM
-- IMPORTANT -> HIGH
-- CRITICAL -> HIGH

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM "InventoryLine" WHERE "priority"::text = 'NORMAL' LIMIT 1) THEN
        UPDATE "InventoryLine" SET "priority" = 'MEDIUM' WHERE "priority"::text = 'NORMAL';
    END IF;
    
    IF EXISTS (SELECT 1 FROM "InventoryLine" WHERE "priority"::text = 'IMPORTANT' LIMIT 1) THEN
        UPDATE "InventoryLine" SET "priority" = 'HIGH' WHERE "priority"::text = 'IMPORTANT';
    END IF;
    
    IF EXISTS (SELECT 1 FROM "InventoryLine" WHERE "priority"::text = 'CRITICAL' LIMIT 1) THEN
        UPDATE "InventoryLine" SET "priority" = 'HIGH' WHERE "priority"::text = 'CRITICAL';
    END IF;
END $$;

-- Paso 3: Eliminar valores antiguos del enum (PostgreSQL requiere recrear el enum)
-- Primero, crear el nuevo enum temporal
DO $$ 
BEGIN
    -- Crear nuevos enums si no existen
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventorycondition_new') THEN
        CREATE TYPE "inventorycondition_new" AS ENUM ('NEW', 'USED_LT_1Y', 'USED_GT_1Y');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventorypriority_new') THEN
        CREATE TYPE "inventorypriority_new" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
    END IF;
END $$;

-- Paso 4: Eliminar defaults antes de cambiar el tipo
ALTER TABLE "InventoryLine" 
    ALTER COLUMN "condition" DROP DEFAULT;

ALTER TABLE "InventoryLine" 
    ALTER COLUMN "priority" DROP DEFAULT;

-- Paso 5: Cambiar el tipo de la columna usando el nuevo enum
ALTER TABLE "InventoryLine" 
    ALTER COLUMN "condition" TYPE "inventorycondition_new" 
    USING "condition"::text::"inventorycondition_new";

ALTER TABLE "InventoryLine" 
    ALTER COLUMN "priority" TYPE "inventorypriority_new" 
    USING "priority"::text::"inventorypriority_new";

-- Paso 6: Eliminar el enum antiguo y renombrar el nuevo
DROP TYPE IF EXISTS "InventoryCondition";
DROP TYPE IF EXISTS "InventoryPriority";

ALTER TYPE "inventorycondition_new" RENAME TO "InventoryCondition";
ALTER TYPE "inventorypriority_new" RENAME TO "InventoryPriority";

-- Paso 7: Actualizar defaults
ALTER TABLE "InventoryLine" 
    ALTER COLUMN "condition" SET DEFAULT 'USED_LT_1Y';

ALTER TABLE "InventoryLine" 
    ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';

