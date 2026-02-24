BEGIN;

-- 1) Crear enum si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HostWorkGroupStatus') THEN
    CREATE TYPE "HostWorkGroupStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END$$;

-- 2) Agregar columna status si no existe
ALTER TABLE "HostWorkGroup"
  ADD COLUMN IF NOT EXISTS "status" "HostWorkGroupStatus" NOT NULL DEFAULT 'ACTIVE';

-- 3) Ajustar unicidad: solo ACTIVE
--    3.1) Drop del índice único viejo (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'HostWorkGroup_tenantId_name_key'
      AND n.nspname = 'public'
  ) THEN
    DROP INDEX "HostWorkGroup_tenantId_name_key";
  END IF;
END$$;

--    3.2) Crear índice único parcial (solo ACTIVE)
CREATE UNIQUE INDEX IF NOT EXISTS "HostWorkGroup_tenantId_name_active_key"
  ON "HostWorkGroup" ("tenantId", "name")
  WHERE "status" = 'ACTIVE';

-- 4) Índice para filtrado por status (opcional pero recomendado)
CREATE INDEX IF NOT EXISTS "HostWorkGroup_status_idx"
  ON "HostWorkGroup" ("status");

COMMIT;
