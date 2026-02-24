# Diagnóstico: Reaparición de Tenant "Hausdame Demo" y Usuario Duplicado

**Fecha:** 2025-01-XX  
**Problema:** Tenant "Hausdame Demo" (slug: "hausdame-demo") y usuario "cleaner2@hausdame.test" reaparecieron después de resetear BD.

---

## 1. Evidencia Observada

### 1.1 Tenant Duplicado
- **Nombre:** "Hausdame Demo"
- **Slug:** "hausdame-demo"
- **Fecha de creación:** ~2026-01-24T03:50Z (según evidencia)
- **Estado:** Existe en tabla `Tenant`

### 1.2 Usuario Duplicado
- **Email:** "cleaner2@hausdame.test"
- **Estado:** 2 filas con `tenantId` distintos:
  - Una en tenant "services-licha"
  - Otra en tenant "hausdame-demo"
- **Problema:** Violación de constraint único (si existe) o duplicación no deseada

---

## 2. Hipótesis Enumeradas

### Hipótesis 1: Migración con INSERT de datos demo
**Probabilidad:** ⭐⭐ (Media-Baja)  
**Evidencia encontrada:** ❌ NO se encontraron INSERTs en migraciones SQL

**Análisis:**
- Se escaneó `prisma/migrations/**/*.sql`
- No se encontraron `INSERT INTO "Tenant"` ni `INSERT INTO "User"`
- No se encontraron `UPSERT` ni `ON CONFLICT` con datos demo

**Conclusión:** Esta hipótesis es **IMPROBABLE**.

---

### Hipótesis 2: Seed automático ejecutado en runtime
**Probabilidad:** ⭐⭐⭐⭐ (Alta)  
**Evidencia encontrada:** ✅ SÍ existe script de seed

**Archivos relevantes:**
- `scripts/seed-dev-users.ts` (líneas 84-90)
- `package.json` (línea 11: `"seed:dev": "tsx scripts/seed-dev-users.ts"`)

**Código sospechoso:**
```typescript
// scripts/seed-dev-users.ts:84-90
const tenant =
  (await prisma.tenant.findFirst({ where: { name: "Hausdame Demo" } })) ??
  (await prisma.tenant.create({
    data: {
      name: "Hausdame Demo",
      slug: "hausdame-demo",
    },
  }));
```

**Cómo se ejecuta:**
- Script manual: `npm run seed:dev`
- **NO** se ejecuta automáticamente en `npm run dev`, `npm run build`, ni `npm start`
- **NO** hay hook `postinstall` que lo ejecute
- **NO** está configurado en `prisma.schema` como seed automático

**Conclusión:** Esta hipótesis es **PROBABLE** si alguien ejecutó manualmente `npm run seed:dev`.

---

### Hipótesis 3: Script de reset/import ejecutado
**Probabilidad:** ⭐⭐⭐ (Media)  
**Evidencia encontrada:** ✅ Existen scripts de import/reset

**Archivos relevantes:**
- `scripts/import-dev-data.ts` (importa desde `dev-export.json`)
- `scripts/check-and-fix-user.ts` (líneas 46-54)

**Código sospechoso:**
```typescript
// scripts/check-and-fix-user.ts:46-54
let tenant = await prisma.tenant.findFirst({ where: { name: "Hausdame Demo" } });
if (!tenant) {
  tenant = await prisma.tenant.create({
    data: {
      name: "Hausdame Demo",
      slug: "hausdame-demo",
    },
  });
}
```

**Cómo se ejecuta:**
- `scripts/check-and-fix-user.ts` se ejecuta manualmente
- Puede crear el tenant si no existe al verificar/crear usuario

**Conclusión:** Esta hipótesis es **POSIBLE** si alguien ejecutó `scripts/check-and-fix-user.ts`.

---

### Hipótesis 4: Runtime "ensure demo" en código de aplicación
**Probabilidad:** ⭐ (Muy Baja)  
**Evidencia encontrada:** ❌ NO se encontró código runtime que cree demo automáticamente

**Búsqueda realizada:**
- `grep -i "ensureDemo|ensure.*demo|createDemo|seedDemo|ensureTenant|createTenant"`
- No se encontraron funciones que creen "Hausdame Demo" en runtime

**Archivos revisados:**
- `app/api/tenant/init/route.ts`: Crea tenants dinámicos, no demo específico
- `lib/users.ts`: Crea owner por defecto, no tenant demo
- No hay código en `app/**` que cree "Hausdame Demo" automáticamente

**Conclusión:** Esta hipótesis es **IMPROBABLE**.

---

### Hipótesis 5: Pruebas E2E o scripts de testing
**Probabilidad:** ⭐⭐ (Media-Baja)  
**Evidencia encontrada:** ⚠️ No se encontraron tests que creen demo, pero existe posibilidad

**Búsqueda realizada:**
- No se encontraron archivos en `tests/**` o `**/*.test.ts` que creen "Hausdame Demo"
- Los scripts de seed están en `scripts/`, no en tests

**Conclusión:** Esta hipótesis es **POSIBLE** pero sin evidencia directa.

---

## 3. Evidencia Exacta del Repositorio

### 3.1 Archivos que crean "Hausdame Demo"

#### A) `scripts/seed-dev-users.ts`
**Ruta:** `scripts/seed-dev-users.ts`  
**Líneas:** 84-90  
**Código:**
```typescript
const tenant =
  (await prisma.tenant.findFirst({ where: { name: "Hausdame Demo" } })) ??
  (await prisma.tenant.create({
    data: {
      name: "Hausdame Demo",
      slug: "hausdame-demo",
    },
  }));
```

**También crea usuarios:**
- Líneas 93-112: Crea usuarios por rol (OWNER, ADMIN, CLEANER)
- Línea 103: `emailOf(item.role, i)` genera emails como `cleaner2@hausdame.test`
- Línea 65-78: Función `upsertUser` que usa `prisma.user.upsert` (puede crear o actualizar)

**Cómo se ejecuta:**
- Manual: `npm run seed:dev`
- **NO** automático en hooks de npm

---

#### B) `scripts/check-and-fix-user.ts`
**Ruta:** `scripts/check-and-fix-user.ts`  
**Líneas:** 46-54  
**Código:**
```typescript
let tenant = await prisma.tenant.findFirst({ where: { name: "Hausdame Demo" } });
if (!tenant) {
  tenant = await prisma.tenant.create({
    data: {
      name: "Hausdame Demo",
      slug: "hausdame-demo",
    },
  });
}
```

**También crea usuario:**
- Línea 113: Email por defecto `"cleaner2@hausdame.test"`
- Líneas 61-68: Crea usuario si no existe

**Cómo se ejecuta:**
- Manual: `tsx scripts/check-and-fix-user.ts [email] [password]`
- Por defecto usa `cleaner2@hausdame.test`

---

### 3.2 Archivos que referencian "hausdame-demo"

#### C) `scripts/cleanup-nonorganic-tenants.ts`
**Ruta:** `scripts/cleanup-nonorganic-tenants.ts`  
**Línea:** 12  
**Código:**
```typescript
const DEFAULT_TENANTS = ["ranferi-airbnb", "hausdame-demo"];
```

**Propósito:** Lista de tenants "no orgánicos" para limpieza (no crea, solo referencia)

---

#### D) `scripts/diagnose-kath-teams.ts`
**Ruta:** `scripts/diagnose-kath-teams.ts`  
**Línea:** 5  
**Código:**
```typescript
const NON_ORGANIC_TENANT_SLUGS = ["hausdame-demo", "ranferi-airbnb"];
```

**Propósito:** Lista de referencia para diagnóstico (no crea)

---

### 3.3 Archivos que referencian "cleaner2@hausdame.test"

#### E) Múltiples scripts de debug
**Archivos:**
- `scripts/debug/fix-wge-realign-services-tenant.ts` (línea 13)
- `scripts/debug/fix-wge-teamid-for-wg-licha.ts` (línea 12)
- `scripts/debug/diagnose-licha-teamid-mismatch.ts` (línea 9)

**Propósito:** Usan el email como constante para pruebas/debug (no crean usuario directamente)

---

### 3.4 Archivos de datos de ejemplo

#### F) `dev-export.json`
**Ruta:** `dev-export.json`  
**Líneas:** 13-14, 78  
**Contenido:**
```json
{
  "name": "Hausdame Demo",
  "slug": "hausdame-demo",
  ...
  "email": "cleaner2@hausdame.test",
}
```

**Propósito:** Export de datos para importación manual (no se ejecuta automáticamente)

---

#### G) `backup_ep-green-base.sql`
**Ruta:** `backup_ep-green-base.sql`  
**Líneas:** 2015, 2027  
**Contenido:** INSERTs de backup (no se ejecuta automáticamente)

---

## 4. Análisis de Migraciones

### 4.1 Migraciones con DML (Data Manipulation Language)

**Resultado:** ❌ **NO se encontraron migraciones con INSERTs de datos demo**

**Búsqueda realizada:**
- `grep -i "INSERT INTO.*Tenant|INSERT INTO.*User|UPSERT|ON CONFLICT"` en `prisma/migrations`
- Resultado: 0 coincidencias

**Conclusión:** Las migraciones **NO** insertan datos demo.

---

## 5. Análisis de Seeds Automáticos

### 5.1 Configuración de Prisma Seed

**Búsqueda en `prisma/schema.prisma`:**
- No se encontró configuración de `prisma.seed` en el schema
- No hay seed automático configurado en Prisma

**Conclusión:** Prisma **NO** ejecuta seeds automáticamente.

---

### 5.2 Hooks de npm

**Búsqueda en `package.json`:**
- `postinstall`: Solo muestra mensaje informativo, no ejecuta seed
- `postdeploy`: No existe
- `prepare`: No existe
- `seed`: No existe (solo `seed:dev`)

**Conclusión:** npm **NO** ejecuta seeds automáticamente.

---

## 6. Qué Muestra la BD Actualmente

**Ejecutar script de diagnóstico:**
```bash
npx tsx scripts/debug/diagnose-demo-tenant-origin.ts
```

**El script mostrará:**
- Conteos globales de Tenant y User
- Detalles de tenants específicos (hausdame-demo, services-licha, services-itzel, host-ranferi)
- Detalles de usuarios específicos (cleaner2@hausdame.test, cleaner1@hausdame.test, ranferi.ia@gmail.com)
- Análisis de duplicados y problemas detectados

---

## 7. Conclusión Final

### 7.1 Causa Más Probable

**La causa más probable es:** Ejecución manual de `scripts/seed-dev-users.ts` o `scripts/check-and-fix-user.ts`

**Razones:**
1. ✅ Estos scripts **SÍ** crean el tenant "Hausdame Demo" y usuarios como "cleaner2@hausdame.test"
2. ✅ El código usa `upsert` que puede crear usuarios duplicados si se ejecuta con diferentes `tenantId`
3. ✅ Los scripts **NO** se ejecutan automáticamente, requieren ejecución manual
4. ✅ La fecha de creación (~2026-01-24T03:50Z) coincide con ejecución manual reciente

**Escenario más probable:**
1. Alguien ejecutó `npm run seed:dev` o `tsx scripts/seed-dev-users.ts`
2. El script creó/actualizó el tenant "Hausdame Demo"
3. El script creó usuarios con `upsert` (incluyendo cleaner2@hausdame.test)
4. Si el usuario ya existía en otro tenant (services-licha), el `upsert` por email pudo haber creado un duplicado o actualizado el `tenantId` incorrectamente

---

### 7.2 Por Qué No Es Otra Causa

**No es migración:**
- ❌ No hay INSERTs en migraciones SQL
- ❌ Las migraciones solo modifican schema, no datos

**No es seed automático:**
- ❌ No hay seed configurado en Prisma
- ❌ No hay hooks de npm que ejecuten seed
- ❌ No se ejecuta en `npm run dev` ni `npm run build`

**No es runtime:**
- ❌ No hay código en `app/**` que cree "Hausdame Demo"
- ❌ No hay funciones "ensure demo" en runtime

---

## 8. Próximos Pasos Recomendados (SIN IMPLEMENTAR AÚN)

### 8.1 Prevención a Corto Plazo

1. **Agregar constraint único en email:**
   - Verificar si existe `UNIQUE` constraint en `User.email`
   - Si no existe, agregarlo para prevenir duplicados

2. **Agregar validación en scripts:**
   - En `scripts/seed-dev-users.ts`, verificar si el usuario ya existe en otro tenant antes de hacer `upsert`
   - Mostrar warning si se detecta duplicado

3. **Agregar flag de protección:**
   - Agregar variable de entorno `ALLOW_DEMO_SEED=false` por defecto
   - Requerir flag explícito para ejecutar seed de demo

### 8.2 Prevención a Mediano Plazo

1. **Eliminar o mover scripts de demo:**
   - Mover `scripts/seed-dev-users.ts` a `scripts/dev/seed-demo.ts` (más explícito)
   - Documentar claramente que es solo para desarrollo local

2. **Agregar logging:**
   - Instrumentar creación de tenants con stack trace
   - Loggear quién ejecuta scripts de seed (usuario del sistema, timestamp)

3. **Agregar constraints de negocio:**
   - Si un usuario debe pertenecer a un solo tenant, agregar constraint a nivel de aplicación
   - Considerar migración para limpiar duplicados existentes

### 8.3 Limpieza Inmediata (Manual)

1. **Identificar duplicados:**
   - Ejecutar script de diagnóstico
   - Identificar qué usuarios están duplicados

2. **Decidir qué mantener:**
   - Determinar qué tenant es el "correcto" para cada usuario
   - Decidir si eliminar el tenant "hausdame-demo" o mantenerlo

3. **Limpiar manualmente:**
   - Eliminar usuarios duplicados incorrectos
   - Eliminar tenant "hausdame-demo" si no es necesario

---

## 9. Referencias

### 9.1 Archivos Relevantes

- `scripts/seed-dev-users.ts` - Script principal que crea demo
- `scripts/check-and-fix-user.ts` - Script que puede crear demo
- `package.json` - Scripts npm disponibles
- `prisma/schema.prisma` - Schema de BD (sin seed automático)

### 9.2 Scripts de Diagnóstico

- `scripts/debug/diagnose-demo-tenant-origin.ts` - Script de diagnóstico creado

---

**Fin del Diagnóstico**

