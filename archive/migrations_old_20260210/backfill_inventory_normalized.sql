-- Backfill script para campos normalizados de inventario
-- ⚠️ SOLO NECESARIO SI SE IMPORTAN DATOS LEGACY EN EL FUTURO ⚠️
-- 
-- Este script NO es parte del flujo normal de despliegue.
-- Solo úsalo si:
--   1. Importas datos legacy de otro sistema
--   2. Migras datos existentes que no tenían campos normalizados
--
-- Para un despliegue nuevo (BD vacía), NO es necesario ejecutar este script.
-- Los campos nameNormalized y areaNormalized se llenan automáticamente
-- al crear nuevos registros mediante la función normalizeName().

-- Función helper para normalizar (similar a lib/inventory-normalize.ts)
-- En PostgreSQL, podemos usar LOWER y REGEXP_REPLACE

-- Backfill InventoryItem.nameNormalized (solo si hay datos existentes sin normalizar)
UPDATE "InventoryItem"
SET "nameNormalized" = LOWER(REGEXP_REPLACE(TRIM("name"), '\s+', ' ', 'g'))
WHERE "nameNormalized" IS NULL OR "nameNormalized" = '';

-- Backfill InventoryLine.areaNormalized (solo si hay datos existentes sin normalizar)
UPDATE "InventoryLine"
SET "areaNormalized" = LOWER(REGEXP_REPLACE(TRIM("area"), '\s+', ' ', 'g'))
WHERE "areaNormalized" IS NULL OR "areaNormalized" = '';

-- Nota: Si hay duplicados después del backfill, necesitarás resolverlos manualmente
-- antes de agregar los unique constraints.

