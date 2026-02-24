-- FASE 5: Cleanup - Eliminar columnas legacy de la migración de IDs
-- Objetivo: Eliminar por completo columnas legacy y dejar el schema/código sin "doble cableado"
-- 
-- Se mantiene Property.idOld para auditoría/trazabilidad (no se elimina)
-- Se elimina Property.legacyId (viejo PK, ya no se usa)
-- Se elimina propertyIdOld de todas las tablas dependientes

-- ============================================
-- PASO 1: Eliminar índices sobre propertyIdOld
-- ============================================

-- Reservation
DROP INDEX IF EXISTS "Reservation_propertyIdOld_idx";

-- Cleaning
DROP INDEX IF EXISTS "Cleaning_propertyIdOld_idx";

-- Lock
DROP INDEX IF EXISTS "Lock_propertyIdOld_idx";

-- PropertyAdmin
DROP INDEX IF EXISTS "PropertyAdmin_propertyIdOld_idx";

-- PropertyCleaner
DROP INDEX IF EXISTS "PropertyCleaner_propertyIdOld_idx";

-- PropertyHandyman
DROP INDEX IF EXISTS "PropertyHandyman_propertyIdOld_idx";

-- PropertyTeam
DROP INDEX IF EXISTS "PropertyTeam_propertyIdOld_idx";

-- PropertyChecklistItem
-- Deferred: PropertyChecklistItem table doesn't exist at this point; apply later after table creation.
-- DROP INDEX IF EXISTS "PropertyChecklistItem_propertyIdOld_idx";

-- ============================================
-- PASO 2: Eliminar columnas propertyIdOld de tablas dependientes
-- ============================================

ALTER TABLE "Reservation" DROP COLUMN IF EXISTS "propertyIdOld";
ALTER TABLE "Cleaning" DROP COLUMN IF EXISTS "propertyIdOld";
ALTER TABLE "Lock" DROP COLUMN IF EXISTS "propertyIdOld";
ALTER TABLE "PropertyAdmin" DROP COLUMN IF EXISTS "propertyIdOld";
ALTER TABLE "PropertyCleaner" DROP COLUMN IF EXISTS "propertyIdOld";
ALTER TABLE "PropertyHandyman" DROP COLUMN IF EXISTS "propertyIdOld";
ALTER TABLE "PropertyTeam" DROP COLUMN IF EXISTS "propertyIdOld";
-- PropertyChecklistItem: Deferred - table doesn't exist at this point; apply later after table creation.
-- ALTER TABLE "PropertyChecklistItem" DROP COLUMN IF EXISTS "propertyIdOld";

-- ============================================
-- PASO 3: Eliminar Property.legacyId
-- ============================================
-- Nota: Property.idOld se mantiene para auditoría/trazabilidad

ALTER TABLE "Property" DROP COLUMN IF EXISTS "legacyId";

-- ============================================
-- ROLLBACK (para reversión si es necesario)
-- ============================================
-- Para revertir esta migración:
--
-- 1. Recrear Property.legacyId
--    ALTER TABLE "Property" ADD COLUMN "legacyId" TEXT;
--
-- 2. Recrear propertyIdOld en todas las tablas dependientes
--    ALTER TABLE "Reservation" ADD COLUMN "propertyIdOld" TEXT;
--    ALTER TABLE "Cleaning" ADD COLUMN "propertyIdOld" TEXT;
--    ... (repetir para las 8 tablas)
--
-- 3. Recrear índices
--    CREATE INDEX "Reservation_propertyIdOld_idx" ON "Reservation"("propertyIdOld");
--    ... (repetir para las 8 tablas)
--
-- Nota: Los datos de propertyIdOld y legacyId se perderán si se revierte,
-- ya que fueron eliminados en esta migración.

