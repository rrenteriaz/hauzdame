-- 01_drop_fks_for_dev_reset.sql
-- Objetivo: permitir truncar Tenant/User/Asset sin borrar Property/Reservation.

ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS "Property_userId_fkey";
ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS "Property_tenantId_fkey";
ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS "Property_coverMediaId_fkey";

ALTER TABLE "Reservation" DROP CONSTRAINT IF EXISTS "Reservation_tenantId_fkey";

-- Nota: NO tocamos Reservation_propertyId_fkey (Reservation.propertyId -> Property.id)
-- porque no estorba para conservar Property/Reservation y mantener relación.
