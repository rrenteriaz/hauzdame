-- prisma/manual/03c_rebuild_cleanings_from_reservations.sql
-- Dev: reconstruye Cleaning desde Reservation (incluye updatedAt)

TRUNCATE TABLE
  "CleaningAssignee",
  "CleaningChecklistItem",
  "CleaningMedia",
  "CleaningView",
  "Cleaning"
RESTART IDENTITY CASCADE;

INSERT INTO "Cleaning" (
  "id",
  "tenantId",
  "reservationId",
  "scheduledDate",
  "propertyId",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text AS id,
  r."tenantId",
  r."id" AS "reservationId",
  r."endDate" AS "scheduledDate",
  r."propertyId",
  CURRENT_TIMESTAMP AS "updatedAt"
FROM "Reservation" r;
