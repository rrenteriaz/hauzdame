-- 02_truncate_everything_except_property_reservation.sql
DO $$
DECLARE
  sql text;
BEGIN
  SELECT
    'TRUNCATE TABLE ' ||
    string_agg(format('%I.%I', schemaname, tablename), ', ') ||
    ' RESTART IDENTITY CASCADE;'
  INTO sql
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT IN ('Property', 'Reservation', '_prisma_migrations');

  IF sql IS NULL THEN
    RAISE NOTICE 'No tables to truncate.';
  ELSE
    EXECUTE sql;
    RAISE NOTICE '%', sql;
  END IF;
END $$;
