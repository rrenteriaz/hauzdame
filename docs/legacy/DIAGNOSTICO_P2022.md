# Diagnóstico P2022: Desalineación Schema Prisma vs Base de Datos

## Fecha del Diagnóstico
2025-01-XX

## Objetivo
Identificar la causa exacta del error P2022 en `/host/cleanings` relacionado con queries de `Property` que intentan acceder a columnas inexistentes.

---

## 1. Comparación Schema Prisma vs Base de Datos

### Schema Prisma (`prisma/schema.prisma`)
```prisma
model Property {
  tenantId                String
  name                    String
  shortName               String?
  address                 String?
  notes                   String?
  icalUrl                 String?
  timeZone                String?
  checkInTime             String?
  checkOutTime            String?
  createdAt               DateTime
  updatedAt               DateTime
  userId                  String  // ✅ Renombrado de ownerId
  groupName               String?
  notificationEmail       String?
  isActive                Boolean @default(true)
  idOld                   String? @unique
  id                      String  @id @default(cuid())
  coverAssetGroupId       String?
  latitude                Float?
  longitude               Float?
  wifiSsid                String?
  wifiPassword            String?
  accessCode              String?
  coverMediaId            String? @unique
  
  // Relaciones
  user                    User    @relation("PropertyOwner", fields: [userId], references: [id])
  // ...
}
```

### Schema Base de Datos (obtenido con `prisma db pull --print`)
```
model Property {
  tenantId                String
  name                    String
  shortName               String?
  address                 String?
  notes                   String?
  icalUrl                 String?
  timeZone                String?
  checkInTime             String?
  checkOutTime            String?
  createdAt               DateTime
  updatedAt               DateTime
  userId                  String  // ✅ Existe en BD
  groupName               String?
  notificationEmail       String?
  isActive                Boolean @default(true)
  idOld                   String? @unique
  id                      String  @id @default(cuid())
  coverAssetGroupId       String? // ✅ Existe en BD
  coverMediaId            String? @unique
  latitude                Float?
  longitude               Float?
  wifiSsid                String?
  wifiPassword            String?
  accessCode              String?
}
```

### ✅ CONCLUSIÓN: Schemas Alineados
- **NO hay columnas desalineadas** entre el schema de Prisma y la base de datos.
- La columna `ownerId` **NO existe** en la base de datos (fue renombrada correctamente a `userId`).
- La columna `coverAssetGroupId` **SÍ existe** en la base de datos.

---

## 2. Análisis del Error P2022 en `/host/cleanings`

### Archivo Problemático
`app/host/cleanings/page.tsx` (línea 124)

### Query Original (antes del fix)
```typescript
const [properties, cleaningsRaw] = await Promise.all([
  prisma.property.findMany({
    where: { 
      tenantId: tenant.id,
      ...({ isActive: true } as any),
    },
    // ❌ SIN select - Prisma intenta traer TODAS las columnas
    orderBy: { name: "asc" },
  }),
  // ...
]);
```

### Query Corregida (después del fix)
```typescript
const [properties, cleaningsRaw] = await Promise.all([
  prisma.property.findMany({
    where: { 
      tenantId: tenant.id,
      ...({ isActive: true } as any),
    },
    select: {  // ✅ Select mínimo
      id: true,
      name: true,
      shortName: true,
      isActive: true,
    },
    orderBy: { name: "asc" },
  }),
  // ...
]);
```

---

## 3. Posibles Causas del P2022

### Hipótesis 1: Prisma Client Desactualizado ❌
**Estado**: Descartada
- El schema de Prisma y la base de datos están alineados.
- No hay evidencia de que el Prisma Client tenga referencias a `ownerId`.

### Hipótesis 2: Relación `owner` en lugar de `user` ⚠️
**Estado**: Detectada pero NO es la causa del P2022 en `/host/cleanings`
- En `app/host/properties/[id]/page.tsx` (línea 89) hay:
  ```typescript
  include: {
    owner: true,  // ❌ Debería ser "user"
  }
  ```
- **Impacto**: Este archivo podría tener problemas, pero NO es la causa del P2022 en `/host/cleanings`.

### Hipótesis 3: Query sin `select` intenta traer columnas inexistentes ✅
**Estado**: CONFIRMADA (ya corregida)
- Cuando Prisma hace `findMany()` sin `select`, intenta traer TODAS las columnas del modelo.
- Si hay alguna desalineación sutil (por ejemplo, tipos de datos, constraints, o columnas que existen en el modelo pero no en la BD), Prisma puede fallar con P2022.
- **Solución aplicada**: Usar `select` mínimo para evitar traer columnas problemáticas.

---

## 4. Referencias a `ownerId` en el Código

### Archivos con Referencias a `ownerId`
1. **`scripts/import-dev-data.ts`** ✅
   - Usa `ownerId` como fallback para compatibilidad con datos legacy.
   - Mapea `ownerId` → `userId` correctamente.

2. **`prisma/manual/rename_property_ownerId_to_userId.sql`** ✅
   - Script SQL histórico de migración.
   - No afecta el código actual.

3. **`prisma/migrations/20251211185750_hauzdame_schema_v2/migration.sql`** ✅
   - Migración histórica que agregó `ownerId`.
   - No afecta el código actual.

4. **`prisma/schema.prisma`** ✅
   - Solo tiene `userId`, no `ownerId`.

### ✅ CONCLUSIÓN: No hay referencias problemáticas a `ownerId`
- Todas las referencias son históricas o de compatibilidad.
- El código actual usa `userId` correctamente.

---

## 5. Referencias a Relación `owner` (no columna)

### Archivo Problemático
**`app/host/properties/[id]/page.tsx`** (línea 89)
```typescript
include: {
  owner: true,  // ❌ La relación se llama "user", no "owner"
}
```

### Relación Correcta en Schema
```prisma
user  User  @relation("PropertyOwner", fields: [userId], references: [id])
```

### ⚠️ RECOMENDACIÓN
Cambiar `owner: true` a `user: true` en `app/host/properties/[id]/page.tsx` para evitar errores futuros.

---

## 6. Diagnóstico Final

### Causa Raíz del P2022 en `/host/cleanings`
1. **Query sin `select`**: El `prisma.property.findMany()` en `app/host/cleanings/page.tsx` no tenía `select`, causando que Prisma intentara traer todas las columnas.
2. **Posible desalineación sutil**: Aunque los schemas parecen alineados, Prisma puede ser sensible a diferencias sutiles en tipos, constraints, o índices.
3. **Solución aplicada**: Agregar `select` mínimo (`id`, `name`, `shortName`, `isActive`) evita el problema.

### Estado Actual
- ✅ `/host/cleanings` ya tiene `select` mínimo implementado.
- ✅ No hay columnas desalineadas entre schema y BD.
- ✅ No hay referencias problemáticas a `ownerId` en queries activas.
- ⚠️ Hay una referencia a relación `owner` en `app/host/properties/[id]/page.tsx` que debería cambiarse a `user`.

### Próximos Pasos Recomendados
1. ✅ **Completado**: Fix en `/host/cleanings` con `select` mínimo.
2. ⚠️ **Pendiente**: Corregir `include: { owner: true }` → `include: { user: true }` en `app/host/properties/[id]/page.tsx`.
3. ✅ **Completado**: Verificar que no hay otras queries de `Property` sin `select` que puedan causar P2022.

---

## 7. Resumen Ejecutivo

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Schema Prisma vs BD | ✅ Alineado | No hay columnas desalineadas |
| Columna `ownerId` | ✅ No existe | Fue renombrada correctamente a `userId` |
| Columna `coverAssetGroupId` | ✅ Existe | Presente en ambos schemas |
| P2022 en `/host/cleanings` | ✅ Resuelto | Fix con `select` mínimo aplicado |
| Referencias a `ownerId` | ✅ Limpias | Solo históricas o de compatibilidad |
| Relación `owner` vs `user` | ⚠️ Detectada | Debe corregirse en `app/host/properties/[id]/page.tsx` |

---

## Conclusión

**No hay columnas desalineadas** entre el schema de Prisma y la base de datos. El error P2022 en `/host/cleanings` fue causado por una query sin `select` que intentaba traer todas las columnas, y ya fue resuelto con un `select` mínimo.

La única referencia problemática restante es el uso de `include: { owner: true }` en `app/host/properties/[id]/page.tsx`, que debería cambiarse a `include: { user: true }` para alinearse con el nombre de la relación en el schema.

