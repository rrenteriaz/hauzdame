-- prisma/manual/03e_verify_cleanings_match_reservations.sql

-- 1) Conteos totales
SELECT
  (SELECT count(*)::int FROM "Reservation") AS reservations,
  (SELECT count(*)::int FROM "Cleaning") AS cleanings;

-- 2) Limpiezas sin reservation (debe ser 0 si solo creamos desde Reservation)
SELECT count(*)::int AS cleanings_without_reservation
FROM "Cleaning" c
LEFT JOIN "Reservation" r ON r."id" = c."reservationId"
WHERE c."reservationId" IS NOT NULL AND r."id" IS NULL;

-- 3) Reservas sin cleaning (debe ser 0)
SELECT count(*)::int AS reservations_without_cleaning
FROM "Reservation" r
LEFT JOIN "Cleaning" c ON c."reservationId" = r."id"
WHERE c."id" IS NULL;
