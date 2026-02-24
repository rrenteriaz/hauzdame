# QA Checklist — Catálogo de Ítems Genéricos V1

**Contrato:** `docs/contracts/CATALOG_ITEMS_V1.md`  
**Migración:** `prisma/migrations/20250125000000_fix_catalog_item_uniqueness_constraint/migration.sql`  
**Script de deduplicación:** `scripts/dedupe-catalog-items.ts`

---

## Pre-requisitos

### 1. Backup de base de datos
- [ ] Backup completo de la base de datos antes de aplicar cambios en producción/staging
- [ ] Verificar que el backup es restaurable

### 2. Ejecutar script de deduplicación (DRY-RUN)
```bash
# Por defecto solo reporta (dry-run implícito)
npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts

# O explícitamente:
npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts --dry-run
```
- [ ] El script ejecuta sin errores
- [ ] El reporte muestra grupos de duplicados (si existen)
- [ ] Verificar que el número de grupos y losers es razonable
- [ ] **NO modifica datos** (comportamiento por defecto)

---

## Casos de prueba

### Caso 1: Crear item con nameNormalized existente pero diferente categoría

**Objetivo:** Verificar que se reutiliza el item existente y se conserva su categoría original.

**Pasos:**
1. Crear item "Colchón" con categoría `FURNITURE_EQUIPMENT`
2. Intentar crear "Colchón" con categoría `LINENS`

**Resultado esperado:**
- [ ] Se reutiliza el mismo `id` del item creado en paso 1
- [ ] La categoría permanece como `FURNITURE_EQUIPMENT` (no cambia a `LINENS`)
- [ ] No se crea un nuevo item
- [ ] No hay error de constraint único

**Código de referencia:** `lib/inventory.ts` líneas 418-462, `app/host/inventory/actions.ts` líneas 490-523

---

### Caso 2: Aplicar plantilla con categoría distinta

**Objetivo:** Verificar que las plantillas reutilizan items existentes independientemente de la categoría.

**Pasos:**
1. Crear item "Mesa" con categoría `FURNITURE_EQUIPMENT` manualmente
2. Aplicar plantilla que incluye "Mesa" con categoría `DECOR`

**Resultado esperado:**
- [ ] Se reutiliza el item "Mesa" creado en paso 1
- [ ] La categoría permanece como `FURNITURE_EQUIPMENT` (no cambia a `DECOR`)
- [ ] Se crean las `InventoryLine` asociadas al item reutilizado
- [ ] No se crea un nuevo item "Mesa"

**Código de referencia:** `app/host/inventory/template-actions.ts` líneas 211-264

---

### Caso 3: Script de deduplicación (DRY-RUN)

**Objetivo:** Verificar que el script detecta duplicados sin modificar datos.

**Pasos:**
1. Ejecutar: `npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts` (o con `--dry-run`)
2. Revisar el reporte de duplicados

**Resultado esperado:**
- [ ] El script ejecuta sin errores
- [ ] El reporte muestra grupos de duplicados (si existen)
- [ ] Para cada grupo, muestra winner y losers
- [ ] Muestra conteo de relaciones afectadas (InventoryLine, InventoryItemAsset, etc.)
- [ ] **NO modifica datos** (comportamiento por defecto es dry-run)
- [ ] Mensaje indica "DRY RUN (no changes)" o similar

---

### Caso 4: Script de deduplicación (APPLY)

**Objetivo:** Verificar que el script elimina duplicados y reasigna relaciones correctamente.

**Pre-requisito:** Ejecutar dry-run primero y verificar que los cambios son correctos.

**Pasos:**
1. Ejecutar: `npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts --apply`
2. Verificar cambios en la base de datos

**Resultado esperado:**
- [ ] El script requiere `--apply` explícito (no aplica cambios sin el flag)
- [ ] Los losers son archivados (`archivedAt` != null)
- [ ] Los losers tienen `nameNormalized` mutado a `${original}__archived__${id}`
- [ ] Los losers tienen `name` mutado a `${original} (archived ${id})`
- [ ] Las `InventoryLine` de losers son reasignadas al winner
- [ ] Las `InventoryItemAsset` de losers son reasignadas al winner
- [ ] Las `InventoryReport` de losers son reasignadas al winner
- [ ] Las `InventoryReviewItemChange` de losers son reasignadas al winner
- [ ] El reporte final muestra conteos correctos de reasignaciones
- [ ] No hay errores durante la ejecución

**Verificación post-apply:**
```sql
-- Verificar que no quedan duplicados activos
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

-- Verificar que los losers tienen nameNormalized mutado
SELECT id, name, "nameNormalized", "archivedAt"
FROM "InventoryItem"
WHERE "archivedAt" IS NOT NULL
  AND "nameNormalized" NOT LIKE '%__archived__%';
-- Debe retornar 0 filas (todos los archivados tienen nameNormalized mutado)
```

---

### Caso 5: Migración después del dedupe

**Objetivo:** Verificar que la migración se aplica correctamente después de la deduplicación.

**Pasos:**
1. Ejecutar script de deduplicación (apply)
2. Aplicar migración: `npx prisma migrate deploy` (o `npx prisma migrate dev` en desarrollo)

**Resultado esperado:**
- [ ] La migración se aplica sin errores
- [ ] El constraint `InventoryItem_tenantId_nameNormalized_key` existe
- [ ] El constraint antiguo `InventoryItem_tenantId_category_nameNormalized_key` no existe
- [ ] No hay errores de constraint único al crear items

**Verificación post-migración:**
```sql
-- Verificar constraint único
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'InventoryItem'::regclass
  AND conname LIKE '%nameNormalized%';
-- Debe mostrar solo: InventoryItem_tenantId_nameNormalized_key (tipo 'u')
```

---

### Caso 6: Race condition (creación concurrente)

**Objetivo:** Verificar que `upsert` previene duplicados en condiciones de carrera.

**Pasos:**
1. Simular creación concurrente del mismo item (mismo `nameNormalized`)
2. Verificar que solo se crea un item

**Resultado esperado:**
- [ ] Solo se crea un item (no duplicados)
- [ ] El `upsert` maneja la condición de carrera correctamente
- [ ] Si existe, se reutiliza; si no, se crea

**Código de referencia:** `lib/inventory.ts` líneas 465-484, `app/host/inventory/actions.ts` líneas 548-559

---

### Caso 7: Manejo de P2002 (error de constraint único)

**Objetivo:** Verificar que el recovery de P2002 busca correctamente por `nameNormalized`.

**Pasos:**
1. Intentar crear un item que ya existe (trigger P2002)
2. Verificar que el recovery funciona

**Resultado esperado:**
- [ ] El error P2002 es capturado
- [ ] El recovery busca por `tenantId` + `nameNormalized` (sin `category`)
- [ ] Se reutiliza el item existente
- [ ] Se conserva la categoría original del item existente
- [ ] No se crea un nuevo item

**Código de referencia:** `app/host/inventory/actions.ts` líneas 553-595

---

## Validaciones post-implementación

### Base de datos
- [ ] Constraint único correcto: `UNIQUE (tenantId, nameNormalized)`
- [ ] No existe constraint que incluya `category` en la identidad
- [ ] No hay duplicados activos (`archivedAt IS NULL`) con mismo `nameNormalized`

### Código
- [ ] Todas las búsquedas de reutilización usan `findUnique` con `tenantId_nameNormalized` (o `findFirst` como fallback)
- [ ] No hay búsquedas que incluyan `category` para detectar duplicados
- [ ] Los `upsert` usan `tenantId_nameNormalized` como `where`
- [ ] Los comentarios referencian `CATALOG_ITEMS_V1 §4.3` donde corresponde
- [ ] El manejo de duplicados es determinístico (ordenado por `createdAt` asc, luego `id` asc)

### Plantillas
- [ ] Las plantillas buscan por `nameNormalized` únicamente
- [ ] Los maps usan `nameNormalized` como key (no `category::nameNormalized`)
- [ ] Se detectan y loggean duplicados si existen (corrupción de datos)

---

## Instrucciones de ejecución

### Desarrollo
```bash
# 1. Dry-run del script de deduplicación (por defecto solo reporta)
npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts
# O explícitamente:
npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts --dry-run

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
npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts
# O explícitamente:
npx tsx -r dotenv/config scripts/dedupe-catalog-items.ts --dry-run

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

---

## Referencias

- Contrato: `docs/contracts/CATALOG_ITEMS_V1.md`
- Migración: `prisma/migrations/20250125000000_fix_catalog_item_uniqueness_constraint/migration.sql`
- Script: `scripts/dedupe-catalog-items.ts`
- Código principal:
  - `lib/inventory.ts` (función `createInventoryLine`)
  - `app/host/inventory/actions.ts` (funciones `createCatalogItemAction`, `createInventoryItemAction`)
  - `app/host/inventory/template-actions.ts` (función `applyInventoryTemplateToProperty`)

