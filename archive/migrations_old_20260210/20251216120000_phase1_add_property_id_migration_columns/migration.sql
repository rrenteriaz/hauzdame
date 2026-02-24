-- FASE 1: Agregar columnas paralelas para migración de ID en Property
-- Agregar idOld (legacy) y newId (nuevo cuid) a Property

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "idOld" TEXT;
ALTER TABLE "Property" ADD COLUMN "newId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Property_idOld_key" ON "Property"("idOld");
CREATE UNIQUE INDEX "Property_newId_key" ON "Property"("newId");

