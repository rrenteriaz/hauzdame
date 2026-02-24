-- prisma/manual/verify_reattach.sql

-- Counts
SELECT 'Property' AS table, count(*)::int AS count FROM "Property"
UNION ALL
SELECT 'Reservation', count(*)::int FROM "Reservation";

-- Distintos tenantId (debe quedar 1 solo)
SELECT
  'Property' AS table,
  count(DISTINCT "tenantId")::int AS distinct_tenants
FROM "Property"
UNION ALL
SELECT
  'Reservation',
  count(DISTINCT "tenantId")::int
FROM "Reservation";

-- Propiedades que no quedaron con el userId esperado (debe dar 0)
SELECT count(*)::int AS properties_wrong_user
FROM "Property"
WHERE "userId" <> 'cmkptilef0001x4o7e90ge8mr';
