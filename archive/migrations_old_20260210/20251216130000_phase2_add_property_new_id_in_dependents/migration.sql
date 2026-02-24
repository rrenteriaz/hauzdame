-- FASE 2: Agregar propertyNewId en todas las tablas que referencian Property.id
-- Esto permite migrar las relaciones de forma segura

-- Reservation
ALTER TABLE "Reservation" ADD COLUMN "propertyNewId" TEXT;
CREATE INDEX IF NOT EXISTS "Reservation_propertyNewId_idx" ON "Reservation"("propertyNewId");

-- Cleaning
ALTER TABLE "Cleaning" ADD COLUMN "propertyNewId" TEXT;
CREATE INDEX IF NOT EXISTS "Cleaning_propertyNewId_idx" ON "Cleaning"("propertyNewId");

-- Lock
ALTER TABLE "Lock" ADD COLUMN "propertyNewId" TEXT;
CREATE INDEX IF NOT EXISTS "Lock_propertyNewId_idx" ON "Lock"("propertyNewId");

-- PropertyAdmin
ALTER TABLE "PropertyAdmin" ADD COLUMN "propertyNewId" TEXT;
CREATE INDEX IF NOT EXISTS "PropertyAdmin_propertyNewId_idx" ON "PropertyAdmin"("propertyNewId");

-- PropertyCleaner
ALTER TABLE "PropertyCleaner" ADD COLUMN "propertyNewId" TEXT;
CREATE INDEX IF NOT EXISTS "PropertyCleaner_propertyNewId_idx" ON "PropertyCleaner"("propertyNewId");

-- PropertyHandyman
ALTER TABLE "PropertyHandyman" ADD COLUMN "propertyNewId" TEXT;
CREATE INDEX IF NOT EXISTS "PropertyHandyman_propertyNewId_idx" ON "PropertyHandyman"("propertyNewId");

-- PropertyTeam
ALTER TABLE "PropertyTeam" ADD COLUMN "propertyNewId" TEXT;
CREATE INDEX IF NOT EXISTS "PropertyTeam_propertyNewId_idx" ON "PropertyTeam"("propertyNewId");

-- PropertyChecklistItem
-- Nota: PropertyChecklistItem no existe aún en este punto de las migraciones.
-- Estas líneas se agregarán en una migración posterior, después de que se cree la tabla PropertyChecklistItem.
-- ALTER TABLE "PropertyChecklistItem" ADD COLUMN "propertyNewId" TEXT;
-- CREATE INDEX "PropertyChecklistItem_propertyNewId_idx" ON "PropertyChecklistItem"("propertyNewId");

