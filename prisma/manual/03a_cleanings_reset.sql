-- prisma/manual/03a_cleanings_reset.sql
-- Dev reset: borramos limpiezas y dependientes (CASCADE) para reconstruir desde Reservation.

TRUNCATE TABLE
  "CleaningAssignee",
  "CleaningChecklistItem",
  "CleaningMedia",
  "CleaningView",
  "Cleaning"
RESTART IDENTITY CASCADE;
