-- prisma/manual/reattach_property_reservation_to_new_host.sql

-- 1) Propiedades -> nuevo tenant + nuevo user
UPDATE "Property"
SET
  "tenantId" = 'cmkptilbc0000x4o7lvmlls57',
  "userId"   = 'cmkptilef0001x4o7e90ge8mr';

-- 2) Reservas -> nuevo tenant
UPDATE "Reservation"
SET
  "tenantId" = 'cmkptilbc0000x4o7lvmlls57';
