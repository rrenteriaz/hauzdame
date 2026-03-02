# Procedimiento: Resolver historial de migraciones Prisma (sin reset)

## OBJETIVO

Resolver definitivamente el historial de migraciones SIN resetear la DB (conservar datos), dejando Prisma con un historial sano y aplicando la migración de `inventoryLineId` de forma real.

## REGLAS

- NO usar `prisma migrate reset`.
- NO borrar datos de negocio.
- Todo cambio debe ser reversible (backup primero).
- Antes de ejecutar cualquier comando peligroso, validar con queries.
- Documentar en `docs/migrations/` el resultado final (qué se hizo y por qué).

## CONTEXTO (A AUDITAR)

- Sospecha: `inventoryLineId` NO existe en:
  - InventoryReviewItemChange
  - InventoryReport
- => La migración `20260210120000_add_inventory_line_id_to_review_items_and_reports` no está aplicada físicamente.

---

## FASE 0 — BACKUP (NEON)

1) Crear un "point-in-time restore" / branch backup en Neon (desde UI).
   - Nombre sugerido: `backup_before_prisma_migration_fix_YYYYMMDD_HHMM`
2) Confirmar que el backup/branch aparece en Neon.

**ENTREGABLE FASE 0**
- Confirmación textual: "Backup creado" + nombre exacto del backup/branch.

---

## FASE 1 — INVENTARIO DE ESTADO REAL EN DB (NEON SQL)

En Neon (SQL Editor), ejecutar y pegar resultados completos.

### A) Estado de _prisma_migrations (conteo y ejemplo)

```sql
SELECT COUNT(*) AS migrations_count FROM "_prisma_migrations";

SELECT migration_name, finished_at
FROM "_prisma_migrations"
ORDER BY finished_at DESC NULLS LAST
LIMIT 15;
```

### B) Confirmar si existen tablas de Variant Groups

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('VariantGroup','VariantOption','InventoryItemVariantGroup')
ORDER BY table_name;
```

### C) Confirmar columnas ical* en Property

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='Property'
  AND column_name LIKE 'ical%'
ORDER BY column_name;
```

### D) Confirmar drift específico conocido (InventoryCheck.inventoryItemId)

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='InventoryCheck'
  AND column_name='inventoryItemId';
```

### E) Confirmar UNIQUEs reales en InventoryItem

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname='public'
  AND tablename='InventoryItem'
  AND indexdef ILIKE '%UNIQUE%'
ORDER BY indexname;
```

### F) Auditoría explícita: confirmar si inventoryLineId existe o NO (debe retornar 0 filas si NO existe)

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('InventoryReviewItemChange','InventoryReport')
  AND column_name='inventoryLineId';
```

**ENTREGABLE FASE 1**
- Pegar resultados completos de A, B, C, D, E, F.
- NO ejecutar nada más aún.

---

## FASE 2 — AUDITAR MIGRACIONES LOCALES (WINDOWS POWERSHELL)

Desde la raíz del repo:

### Listar migraciones

```powershell
Get-ChildItem prisma\migrations
```

### Mostrar nombres exactos (ordenados)

```powershell
Get-ChildItem prisma\migrations -Directory | Select-Object -ExpandProperty Name | Sort-Object
```

### Checksums (portable, compatible con PowerShell)

```powershell
python -c @"
import hashlib, pathlib
for p in ['prisma/migrations/00000000000000_baseline/migration.sql', 'prisma/migrations/20260210120000_add_inventory_line_id_to_review_items_and_reports/migration.sql']:
    b = pathlib.Path(p).read_bytes()
    print(p, 'sha256=', hashlib.sha256(b).hexdigest(), 'bytes=', len(b))
"@
```

**ENTREGABLE FASE 2**
- Pegar outputs completos.

---

### Resultados Phase 2 (ejecutado 2026-02-10)

```
Get-ChildItem prisma\migrations:
  - 00000000000000_baseline
  - 20260210120000_add_inventory_line_id_to_review_items_and_reports
  - 20260217022700_add_tenant_variant_groups
  - 20260218000000_add_ical_sync_fields
  - migration_lock.toml

Nombres ordenados:
  00000000000000_baseline
  20260210120000_add_inventory_line_id_to_review_items_and_reports
  20260217022700_add_tenant_variant_groups
  20260218000000_add_ical_sync_fields

Checksums SHA256:
  prisma/migrations/00000000000000_baseline/migration.sql
    sha256= cff0fdf0ee75961d00b7a252c79ccad4d510af4836d346ba3ec5113976d4dd9c
    bytes= 78656

  prisma/migrations/20260210120000_add_inventory_line_id_to_review_items_and_reports/migration.sql
    sha256= a1e9a1b460e559cbeba32dc7b9fa599ddaa47bd08f5ec5911992efd30786ab55
    bytes= 894
```

---

## FASE 3 — DECISIÓN (NO EJECUTAR SIN OK)

Con los resultados, se define el plan final exacto (sin reset), que normalmente será:

### CAMINO A (si schema real coincide con baseline "nueva")

1. `TRUNCATE TABLE "_prisma_migrations";` (en Neon)
2. `npx prisma migrate resolve --applied "00000000000000_baseline"`
3. `npx prisma migrate resolve --applied` para migraciones que YA estén aplicadas físicamente (VariantGroup, ical si existen)
4. `npx prisma migrate dev` para aplicar SOLO lo pendiente (incluida inventoryLineId)

### CAMINO B (si schema real NO coincide suficiente)

- Crear baseline "de la DB" (snapshot) y alinear schema/migraciones al estado real para eliminar drift, sin tocar datos.

**NOTA CRÍTICA**
- No ejecutar deletes en _prisma_migrations ni resolve hasta confirmar el CAMINO exacto.
- Usar TRUNCATE + resolve baseline (no DELETE manteniendo baseline) para evitar error de checksum.
