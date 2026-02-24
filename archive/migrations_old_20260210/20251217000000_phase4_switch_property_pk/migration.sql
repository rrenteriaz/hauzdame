-- FASE 4: Switch de Primary Key en Property
-- Objetivo: Property.id ahora es el nuevo PK (cuid), y todas las tablas dependientes usan propertyId apuntando al nuevo PK
-- Reversible: Sí (ver sección ROLLBACK al final)

-- ============================================
-- PASO 1: Eliminar FKs que dependen de Property.id (legacy)
-- ============================================
-- Primero eliminamos todas las FKs que apuntan a Property.id para poder cambiar el PK

ALTER TABLE "Reservation" DROP CONSTRAINT IF EXISTS "Reservation_propertyId_fkey";
ALTER TABLE "Cleaning" DROP CONSTRAINT IF EXISTS "Cleaning_propertyId_fkey";
ALTER TABLE "Lock" DROP CONSTRAINT IF EXISTS "Lock_propertyId_fkey";
ALTER TABLE "PropertyAdmin" DROP CONSTRAINT IF EXISTS "PropertyAdmin_propertyId_fkey";
ALTER TABLE "PropertyCleaner" DROP CONSTRAINT IF EXISTS "PropertyCleaner_propertyId_fkey";
ALTER TABLE "PropertyHandyman" DROP CONSTRAINT IF EXISTS "PropertyHandyman_propertyId_fkey";
ALTER TABLE "PropertyTeam" DROP CONSTRAINT IF EXISTS "PropertyTeam_propertyId_fkey";
ALTER TABLE "ChatThread" DROP CONSTRAINT IF EXISTS "ChatThread_propertyId_fkey";
ALTER TABLE "InventoryLine" DROP CONSTRAINT IF EXISTS "InventoryLine_propertyId_fkey";
ALTER TABLE "InventoryReview" DROP CONSTRAINT IF EXISTS "InventoryReview_propertyId_fkey";
-- PropertyChecklistItem e InventoryCheck: Pueden existir si fueron creadas antes (20250121000000, 20250125000000)
ALTER TABLE "PropertyChecklistItem" DROP CONSTRAINT IF EXISTS "PropertyChecklistItem_propertyId_fkey";
ALTER TABLE "InventoryCheck" DROP CONSTRAINT IF EXISTS "InventoryCheck_propertyId_fkey";

-- ============================================
-- PASO 2: Preparar Property
-- ============================================

-- 2.1: Verificar que newId no sea NULL (debe estar poblado desde FASE 3)
-- Si hay NULLs, la migración fallará al intentar hacer NOT NULL
-- Esto es intencional para detectar problemas antes de continuar

-- 2.2: Renombrar columnas en Property
-- Renombrar id (legacy) a legacyId
ALTER TABLE "Property" RENAME COLUMN "id" TO "legacyId";

-- Renombrar newId a id (será el nuevo PK)
ALTER TABLE "Property" RENAME COLUMN "newId" TO "id";

-- 2.3: Eliminar constraints y índices que dependen del PK viejo
-- Eliminar el PK actual (sobre legacyId) - ahora es seguro porque eliminamos las FKs
-- Usar CASCADE para manejar cualquier FK que aún pueda existir (p. ej. PropertyChecklistItem creada antes)
ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS "Property_pkey" CASCADE;

-- Eliminar el unique constraint sobre id (ahora legacyId)
DROP INDEX IF EXISTS "Property_idOld_key";
-- Nota: idOld puede no existir, pero lo manejamos

-- Eliminar el unique constraint sobre newId (ahora id)
DROP INDEX IF EXISTS "Property_newId_key";

-- 2.4: Hacer id NOT NULL y establecer como nuevo PK
ALTER TABLE "Property" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "Property" ADD PRIMARY KEY ("id");

-- 2.5: Recrear índices necesarios
CREATE UNIQUE INDEX IF NOT EXISTS "Property_idOld_key" ON "Property"("idOld");
CREATE INDEX IF NOT EXISTS "Property_tenantId_idx" ON "Property"("tenantId");

-- ============================================
-- PASO 3: Actualizar tablas dependientes (8 tablas)
-- ============================================

-- 3.1: Reservation
-- Verificar que propertyNewId esté poblado antes de continuar
-- (Si hay NULLs, la FK fallará al crearse)

-- Renombrar columnas
ALTER TABLE "Reservation" RENAME COLUMN "propertyId" TO "propertyIdOld";
ALTER TABLE "Reservation" RENAME COLUMN "propertyNewId" TO "propertyId";

-- FK vieja ya fue eliminada en PASO 1

-- Hacer propertyId NOT NULL (debe estar poblado)
ALTER TABLE "Reservation" ALTER COLUMN "propertyId" SET NOT NULL;

-- Crear nueva FK apuntando a Property.id
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_propertyId_fkey" 
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Eliminar índices viejos
DROP INDEX IF EXISTS "Reservation_propertyId_idx";
DROP INDEX IF EXISTS "Reservation_propertyNewId_idx";

-- Recrear índices
CREATE INDEX IF NOT EXISTS "Reservation_propertyId_idx" ON "Reservation"("propertyId");
CREATE INDEX IF NOT EXISTS "Reservation_propertyIdOld_idx" ON "Reservation"("propertyIdOld");

-- Recrear unique constraint (ahora usa propertyId nuevo)
DROP INDEX IF EXISTS "Reservation_propertyId_calendarUid_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_propertyId_calendarUid_key" ON "Reservation"("propertyId", "calendarUid");

-- 3.2: Cleaning
ALTER TABLE "Cleaning" RENAME COLUMN "propertyId" TO "propertyIdOld";
ALTER TABLE "Cleaning" RENAME COLUMN "propertyNewId" TO "propertyId";

-- FK vieja ya fue eliminada en PASO 1

ALTER TABLE "Cleaning" ALTER COLUMN "propertyId" SET NOT NULL;

ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_propertyId_fkey" 
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Cleaning_propertyId_idx";
DROP INDEX IF EXISTS "Cleaning_propertyNewId_idx";

CREATE INDEX IF NOT EXISTS "Cleaning_propertyId_idx" ON "Cleaning"("propertyId");
CREATE INDEX IF NOT EXISTS "Cleaning_propertyIdOld_idx" ON "Cleaning"("propertyIdOld");

-- 3.3: Lock
ALTER TABLE "Lock" RENAME COLUMN "propertyId" TO "propertyIdOld";
ALTER TABLE "Lock" RENAME COLUMN "propertyNewId" TO "propertyId";

-- FK vieja ya fue eliminada en PASO 1

ALTER TABLE "Lock" ALTER COLUMN "propertyId" SET NOT NULL;

ALTER TABLE "Lock" ADD CONSTRAINT "Lock_propertyId_fkey" 
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Lock_propertyId_idx";
DROP INDEX IF EXISTS "Lock_propertyNewId_idx";

CREATE INDEX IF NOT EXISTS "Lock_propertyId_idx" ON "Lock"("propertyId");
CREATE INDEX IF NOT EXISTS "Lock_propertyIdOld_idx" ON "Lock"("propertyIdOld");

-- 3.4: PropertyAdmin
ALTER TABLE "PropertyAdmin" RENAME COLUMN "propertyId" TO "propertyIdOld";
ALTER TABLE "PropertyAdmin" RENAME COLUMN "propertyNewId" TO "propertyId";

-- FK vieja ya fue eliminada en PASO 1

ALTER TABLE "PropertyAdmin" ALTER COLUMN "propertyId" SET NOT NULL;

ALTER TABLE "PropertyAdmin" ADD CONSTRAINT "PropertyAdmin_propertyId_fkey" 
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "PropertyAdmin_propertyId_idx";
DROP INDEX IF EXISTS "PropertyAdmin_propertyNewId_idx";

CREATE INDEX IF NOT EXISTS "PropertyAdmin_propertyId_idx" ON "PropertyAdmin"("propertyId");
CREATE INDEX IF NOT EXISTS "PropertyAdmin_propertyIdOld_idx" ON "PropertyAdmin"("propertyIdOld");

-- Recrear unique constraint
DROP INDEX IF EXISTS "PropertyAdmin_propertyId_userId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PropertyAdmin_propertyId_userId_key" ON "PropertyAdmin"("propertyId", "userId");

-- 3.5: PropertyCleaner
ALTER TABLE "PropertyCleaner" RENAME COLUMN "propertyId" TO "propertyIdOld";
ALTER TABLE "PropertyCleaner" RENAME COLUMN "propertyNewId" TO "propertyId";

-- FK vieja ya fue eliminada en PASO 1

ALTER TABLE "PropertyCleaner" ALTER COLUMN "propertyId" SET NOT NULL;

ALTER TABLE "PropertyCleaner" ADD CONSTRAINT "PropertyCleaner_propertyId_fkey" 
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "PropertyCleaner_propertyId_idx";
DROP INDEX IF EXISTS "PropertyCleaner_propertyNewId_idx";

CREATE INDEX IF NOT EXISTS "PropertyCleaner_propertyId_idx" ON "PropertyCleaner"("propertyId");
CREATE INDEX IF NOT EXISTS "PropertyCleaner_propertyIdOld_idx" ON "PropertyCleaner"("propertyIdOld");

-- Recrear unique constraint
DROP INDEX IF EXISTS "PropertyCleaner_propertyId_userId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PropertyCleaner_propertyId_userId_key" ON "PropertyCleaner"("propertyId", "userId");

-- 3.6: PropertyHandyman
ALTER TABLE "PropertyHandyman" RENAME COLUMN "propertyId" TO "propertyIdOld";
ALTER TABLE "PropertyHandyman" RENAME COLUMN "propertyNewId" TO "propertyId";

-- FK vieja ya fue eliminada en PASO 1

ALTER TABLE "PropertyHandyman" ALTER COLUMN "propertyId" SET NOT NULL;

ALTER TABLE "PropertyHandyman" ADD CONSTRAINT "PropertyHandyman_propertyId_fkey" 
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "PropertyHandyman_propertyId_idx";
DROP INDEX IF EXISTS "PropertyHandyman_propertyNewId_idx";

CREATE INDEX IF NOT EXISTS "PropertyHandyman_propertyId_idx" ON "PropertyHandyman"("propertyId");
CREATE INDEX IF NOT EXISTS "PropertyHandyman_propertyIdOld_idx" ON "PropertyHandyman"("propertyIdOld");

-- Recrear unique constraint
DROP INDEX IF EXISTS "PropertyHandyman_propertyId_userId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PropertyHandyman_propertyId_userId_key" ON "PropertyHandyman"("propertyId", "userId");

-- 3.7: PropertyTeam
ALTER TABLE "PropertyTeam" RENAME COLUMN "propertyId" TO "propertyIdOld";
ALTER TABLE "PropertyTeam" RENAME COLUMN "propertyNewId" TO "propertyId";

-- FK vieja ya fue eliminada en PASO 1

ALTER TABLE "PropertyTeam" ALTER COLUMN "propertyId" SET NOT NULL;

ALTER TABLE "PropertyTeam" ADD CONSTRAINT "PropertyTeam_propertyId_fkey" 
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "PropertyTeam_propertyId_idx";
DROP INDEX IF EXISTS "PropertyTeam_propertyNewId_idx";

CREATE INDEX IF NOT EXISTS "PropertyTeam_propertyId_idx" ON "PropertyTeam"("propertyId");
CREATE INDEX IF NOT EXISTS "PropertyTeam_propertyIdOld_idx" ON "PropertyTeam"("propertyIdOld");

-- Recrear unique constraint
DROP INDEX IF EXISTS "PropertyTeam_propertyId_teamId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PropertyTeam_propertyId_teamId_key" ON "PropertyTeam"("propertyId", "teamId");

-- 3.8: PropertyChecklistItem
-- Deferred: PropertyChecklistItem table doesn't exist at this point; apply later after table creation.
-- ALTER TABLE "PropertyChecklistItem" RENAME COLUMN "propertyId" TO "propertyIdOld";
-- ALTER TABLE "PropertyChecklistItem" RENAME COLUMN "propertyNewId" TO "propertyId";
--
-- FK vieja ya fue eliminada en PASO 1
--
-- ALTER TABLE "PropertyChecklistItem" ALTER COLUMN "propertyId" SET NOT NULL;
--
-- ALTER TABLE "PropertyChecklistItem" ADD CONSTRAINT "PropertyChecklistItem_propertyId_fkey" 
--   FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--
-- DROP INDEX IF EXISTS "PropertyChecklistItem_propertyId_idx";
-- DROP INDEX IF EXISTS "PropertyChecklistItem_propertyNewId_idx";
--
-- CREATE INDEX IF NOT EXISTS "PropertyChecklistItem_propertyId_idx" ON "PropertyChecklistItem"("propertyId");
-- CREATE INDEX IF NOT EXISTS "PropertyChecklistItem_propertyIdOld_idx" ON "PropertyChecklistItem"("propertyIdOld");
-- CREATE INDEX IF NOT EXISTS "PropertyChecklistItem_propertyId_isActive_idx" ON "PropertyChecklistItem"("propertyId", "isActive");

-- ============================================
-- ROLLBACK (para reversión si es necesario)
-- ============================================
-- Para revertir esta migración, ejecutar en orden inverso:
--
-- 1. Revertir tablas dependientes (PropertyChecklistItem -> Reservation)
--    - Renombrar propertyId -> propertyNewId
--    - Renombrar propertyIdOld -> propertyId
--    - Eliminar FKs nuevas, recrear FKs viejas apuntando a Property.legacyId
--    - Recrear índices y constraints únicos con propertyId (legacy)
--
-- 2. Revertir Property
--    - Eliminar PK sobre id
--    - Renombrar id -> newId
--    - Renombrar legacyId -> id
--    - Establecer id (legacy) como PK
--    - Hacer newId nullable
--    - Recrear índices

