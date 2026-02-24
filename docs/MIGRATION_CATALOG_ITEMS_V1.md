# Migración — Alineación de CatalogItem con Contratos Canónicos V1

**Contrato:** `docs/contracts/CATALOG_ITEMS_V1.md`  
**Migración:** `prisma/migrations/20250125000000_fix_catalog_item_uniqueness_constraint/migration.sql`  
**Script de deduplicación:** `scripts/dedupe-catalog-items.ts`

---

## Resumen ejecutivo

Esta migración alinea la implementación de `CatalogItem` (modelo `InventoryItem`) con el contrato canónico V1, estableciendo que la identidad es `(tenantId, nameNormalized)` y que `category` es solo clasificación, no parte de la identidad.

---

## Cambios aplicados

### A. Base de datos

**Archivo:** `prisma/schema.prisma`

- **Eliminado:** `@@unique([tenantId, category, nameNormalized])`
- **Agregado:** `@@unique([tenantId, nameNormalized])`

**Migración:** `prisma/migrations/20250125000000_fix_catalog_item_uniqueness_constraint/migration.sql`

- Elimina constraint antiguo que incluía `category`
- Crea constraint correcto sin `category`

---

### B. Código mejorado

**Archivos modificados:**

1. **`lib/inventory.ts`** (función `createInventoryLine`)
   - Búsqueda usa `findFirst` con ordenamiento determinístico
   - Orden: `createdAt` asc, luego `id` asc (más antiguo primero)
   - Al reutilizar, conserva categoría original

2. **`app/host/inventory/actions.ts`** (3 funciones)
   - `checkDuplicateInventoryLineAction`: búsqueda por `nameNormalized` únicamente
   - `createCatalogItemAction`: búsqueda por `nameNormalized` únicamente
   - `createInventoryItemAction`: manejo P2002 busca por `nameNormalized` únicamente

3. **`app/host/inventory/template-actions.ts`** (función `applyInventoryTemplateToProperty`)
   - Búsquedas usan `nameNormalized` únicamente (sin `category`)
   - Maps usan `nameNormalized` como key (no `category::nameNormalized`)
   - Ordenamiento determinístico en queries
   - Detección y logging de duplicados (corrupción de datos)

---

### C. Script de deduplicación

**Archivo:** `scripts/dedupe-catalog-items.ts`

- Detecta duplicados por `(tenantId, nameNormalized)`
- Elige winner determinístico (más antiguo por `createdAt`, luego `id` asc)
- Reasigna relaciones:
  - `InventoryLine`
  - `InventoryItemAsset`
  - `InventoryReport`
  - `InventoryReviewItemChange`
- **Estrategia A (implementada):** Archiva losers y muta `nameNormalized` a `${original}__archived__${id}`
  - Esto garantiza que los losers archivados no violen el constraint `UNIQUE(tenantId, nameNormalized)`
  - Mantiene historia sin borrado físico
- **Comportamiento por defecto:** Solo reporta (DRY RUN), no modifica datos
- **Modo apply:** Requiere flag `--apply` explícito para aplicar cambios

---

## Instrucciones de ejecución

### Desarrollo

```bash
# 1. Dry-run del script de deduplicación (por defecto solo reporta)
npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts --dry-run
# O simplemente (comportamiento por defecto es dry-run):
npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts

# 2. Revisar el reporte y verificar que los cambios son correctos

# 3. Aplicar deduplicación (si hay duplicados) - REQUIERE --apply explícito
npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts --apply

# 4. Aplicar migración
npx prisma migrate dev

# 5. Regenerar cliente de Prisma (importante para que reconozca el compound unique)
npx prisma generate
```

### Producción/Staging

```bash
# 1. Hacer backup de la base de datos (OBLIGATORIO)
# (comando específico según tu infraestructura)

# 2. Dry-run del script de deduplicación (por defecto solo reporta)
npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts --dry-run
# O simplemente (comportamiento por defecto es dry-run):
npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts

# 3. Revisar el reporte y verificar que los cambios son correctos

# 4. Aplicar deduplicación en ventana de mantenimiento - REQUIERE --apply explícito
npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts --apply

# 5. Aplicar migración
npx prisma migrate deploy

# 6. Regenerar cliente de Prisma (importante para que reconozca el compound unique)
npx prisma generate
```

---

## Notas de seguridad

- ⚠️ **Backup obligatorio** antes de ejecutar `--apply` en producción
- ⚠️ **Por defecto el script solo reporta** (no modifica datos). Requiere `--apply` explícito para cambios
- ⚠️ El script archiva los duplicados (no los elimina físicamente)
- ⚠️ Los losers archivados tienen `nameNormalized` mutado a `${original}__archived__${id}` para evitar violación de UNIQUE
- ⚠️ Todas las relaciones se reasignan al winner determinístico
- ⚠️ Ejecutar en ventana de mantenimiento para evitar conflictos
- ⚠️ Después de la migración, regenerar el cliente de Prisma para que reconozca el nuevo compound unique

---

## Validación post-migración

### Base de datos

```sql
-- Verificar constraint único correcto
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'InventoryItem'::regclass
  AND conname LIKE '%nameNormalized%';
-- Debe mostrar solo: InventoryItem_tenantId_nameNormalized_key (tipo 'u')

-- Verificar que no hay duplicados activos
SELECT tenantId, nameNormalized, COUNT(*) as count
FROM "InventoryItem"
WHERE "archivedAt" IS NULL
GROUP BY tenantId, nameNormalized
HAVING COUNT(*) > 1;
-- Debe retornar 0 filas

-- Verificar que no hay duplicados totales (incluyendo archived)
-- Los losers archivados deben tener nameNormalized mutado
SELECT tenantId, nameNormalized, COUNT(*) as count
FROM "InventoryItem"
GROUP BY tenantId, nameNormalized
HAVING COUNT(*) > 1;
-- Debe retornar 0 filas (todos los duplicados fueron resueltos)
```

### Código

- [ ] Todas las búsquedas de reutilización usan `findFirst` con ordenamiento determinístico
- [ ] No hay búsquedas que incluyan `category` para detectar duplicados
- [ ] Los comentarios referencian `CATALOG_ITEMS_V1 §4.3` donde corresponde
- [ ] El manejo de duplicados es determinístico

---

## Archivos modificados

1. `prisma/schema.prisma` — constraint único corregido
2. `prisma/migrations/20250125000000_fix_catalog_item_uniqueness_constraint/migration.sql` — migración creada
3. `lib/inventory.ts` — búsqueda corregida, ordenamiento determinístico
4. `app/host/inventory/template-actions.ts` — lógica de plantillas corregida, detección de duplicados
5. `app/host/inventory/actions.ts` — 3 funciones corregidas, manejo P2002 mejorado
6. `scripts/dedupe-catalog-items.ts` — script de deduplicación mejorado
7. `docs/QA_CATALOG_ITEMS_V1.md` — checklist de QA creado
8. `docs/MIGRATION_CATALOG_ITEMS_V1.md` — este documento

---

## Referencias

- Contrato: `docs/contracts/CATALOG_ITEMS_V1.md`
- QA Checklist: `docs/QA_CATALOG_ITEMS_V1.md`
- Script: `scripts/dedupe-catalog-items.ts`

