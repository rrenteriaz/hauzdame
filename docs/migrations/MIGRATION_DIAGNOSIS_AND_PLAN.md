# Diagnóstico de migraciones y plan de acción (sin reset de DB)

## Estado actual

### Migraciones locales (`prisma/migrations/`)

| Migración | Contenido |
|-----------|-----------|
| `00000000000000_baseline` | Schema completo inicial (~2000 líneas) |
| `20260210120000_add_inventory_line_id...` | +inventoryLineId en InventoryReviewItemChange e InventoryReport |
| `20260217022700_add_tenant_variant_groups` | VariantGroup, VariantOption, InventoryItemVariantGroup |
| `20260218000000_add_ical_sync_fields` | Columnas ical* en Property |

Orden de aplicación por timestamp: baseline → 20260210 → 20260217 → 20260218

### Base de datos

- La tabla `_prisma_migrations` tiene **~50 migraciones antiguas** aplicadas (de otro historial).
- Última migración común con local: `00000000000000_baseline`.
- **Drift detectado** entre “schema esperado” (baseline + migraciones locales) y “schema real” de la DB.

### Drift específico (según Prisma)

| Tabla | Esperado (baseline) | Actual (DB) |
|-------|---------------------|-------------|
| **InventoryCheck** | `inventoryItemId` + FK | Columna y FK eliminados |
| **InventoryItem** | Unique `(tenantId, nameNormalized)` | Unique `(tenantId, category, nameNormalized)` |

Conclusión: la baseline refleja un schema anterior al estado actual de la DB. La DB evolucionó (quitar `inventoryItemId`, cambiar unique de InventoryItem) pero la baseline no se actualizó.

---

## Plan de acción (sin reset)

### Paso 1: Ajustar la baseline para que coincida con la DB ✅ HECHO

Se actualizó `00000000000000_baseline/migration.sql`:
- **InventoryCheck**: eliminada columna `inventoryItemId` y su FK.
- **InventoryItem**: añadido índice único `(tenantId, category, nameNormalized)`.

### Paso 2: Limpiar `_prisma_migrations`

Ejecutar en la DB (SQL directo, ej. Neon):

```sql
-- Dejar solo la baseline como aplicada
DELETE FROM "_prisma_migrations" WHERE "migration_name" != '00000000000000_baseline';
```

### Paso 3: Marcar migraciones ya aplicadas en la DB

Si VariantGroup, VariantOption, InventoryItemVariantGroup y las columnas ical de Property ya existen:

```bash
npx prisma migrate resolve --applied "20260217022700_add_tenant_variant_groups"
npx prisma migrate resolve --applied "20260218000000_add_ical_sync_fields"
```

### Paso 4: Aplicar la migración pendiente

```bash
npx prisma migrate dev --name add_inventory_line_id_to_review_items_and_reports
```

Esto debería aplicar solo `20260210120000_add_inventory_line_id_to_review_items_and_reports` (si no está ya marcada como aplicada).

---

## Orden de ejecución recomendado

1. Hacer backup de la DB (Neon: punto de restauración o dump).
2. Ejecutar Paso 1 (editar baseline).
3. Ejecutar Paso 2 (SQL en la DB).
4. Ejecutar Pasos 3 y 4 (comandos Prisma).

---

## Advertencias

- Si VariantGroup/Property.ical no existen en la DB, no usar `resolve --applied` para esas migraciones; dejar que `migrate dev` las aplique.
- Antes de editar la baseline, conviene comprobar en la DB el estado real de InventoryCheck e InventoryItem (columnas e índices) para no introducir nuevo drift.
- Si tras el Paso 2 `migrate dev` sigue reportando drift, habrá que revisar otros índices/columnas además de InventoryCheck e InventoryItem.

---

## Verificación previa (opcional)

Para confirmar el estado de la DB antes de tocar migraciones:

```sql
-- ¿Tiene InventoryCheck la columna inventoryItemId?
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'InventoryCheck' AND column_name = 'inventoryItemId';

-- Índices únicos en InventoryItem
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'InventoryItem' AND indexdef LIKE '%UNIQUE%';

-- ¿Existen VariantGroup y tablas relacionadas?
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'VariantGroup');

-- ¿Property tiene columnas ical?
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'Property' AND column_name LIKE 'ical%';
```
