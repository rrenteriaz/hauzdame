-- FASE 1: Backfill de idOld y newId en Property
-- Este script debe ejecutarse DESPUÉS de aplicar la migración

-- Paso 1: Copiar el ID actual a idOld
UPDATE "Property" SET "idOld" = "id" WHERE "idOld" IS NULL;

-- Paso 2: Generar nuevos IDs cuid para newId
-- Nota: En PostgreSQL, necesitamos usar una función o generar los IDs desde la aplicación
-- Por ahora, usamos gen_random_uuid() como placeholder, pero debería ser cuid()
-- En producción, esto debería hacerse desde Node.js usando @paralleldrive/cuid2

-- Para desarrollo: usar uuid como placeholder temporal
-- UPDATE "Property" SET "newId" = gen_random_uuid()::text WHERE "newId" IS NULL;

-- IMPORTANTE: El backfill real de newId debe hacerse desde Node.js usando cuid()
-- Ver script: prisma/scripts/phase1_backfill_property_ids.js

-- Validación: Verificar que no hay nulls
-- SELECT COUNT(*) FROM "Property" WHERE "idOld" IS NULL; -- Debe ser 0
-- SELECT COUNT(*) FROM "Property" WHERE "newId" IS NULL; -- Debe ser 0

-- Validación: Verificar que no hay duplicados
-- SELECT "idOld", COUNT(*) FROM "Property" GROUP BY "idOld" HAVING COUNT(*) > 1; -- Debe estar vacío
-- SELECT "newId", COUNT(*) FROM "Property" GROUP BY "newId" HAVING COUNT(*) > 1; -- Debe estar vacío

