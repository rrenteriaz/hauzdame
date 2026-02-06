# Guía de Prevención de Errores P2022

## Problema
El error `P2022` de Prisma ocurre cuando se intenta acceder a una columna o relación que no existe en la base de datos, o cuando el Prisma Client está desactualizado respecto al schema.

## Causas Comunes

### 1. **Queries sin `select` explícito**
Cuando usas `include: { relation: true }` o `include: { relation: { include: { ... } } }` sin especificar `select`, Prisma intenta traer TODAS las columnas del modelo relacionado. Si alguna columna no existe en la BD (por desalineación schema/BD), falla con P2022.

### 2. **Prisma Client desactualizado**
Si cambias el schema pero no regeneras el Prisma Client (`npx prisma generate`), el cliente puede tener referencias a relaciones/columnas antiguas.

### 3. **Desalineación Schema/Base de Datos**
Si el schema de Prisma tiene columnas que no existen en la BD real (o viceversa), las queries fallan.

## Soluciones Aplicadas

### ✅ 1. Usar `select` mínimo en lugar de `include: { relation: true }`

**ANTES (problemático):**
```typescript
prisma.property.findMany({
  include: {
    property: true, // ❌ Trae TODAS las columnas
  },
});
```

**DESPUÉS (correcto):**
```typescript
prisma.property.findMany({
  include: {
    property: {
      select: {
        id: true,
        name: true,
        shortName: true,
      },
    },
  },
});
```

### ✅ 2. Regenerar Prisma Client después de cambios en schema

```bash
npx prisma generate
```

### ✅ 3. Verificar alineación Schema/BD

```bash
npx prisma db pull --print
# Comparar con prisma/schema.prisma
```

## Archivos Corregidos

### 1. `lib/cleanings/cleaningIncludes.ts`
- Cambiado `property: true` → `property: { select: { id, name, shortName } }`

### 2. `app/host/properties/[id]/page.tsx`
- Cambiado `include: { user: true }` → `include: { user: { select: { id, name, email } } }`

### 3. `app/api/applications/route.ts`
- Cambiado `property: true` → `property: { select: { id, name, userId } }`

### 4. `app/host/properties/create-missing-cleanings.ts`
- Cambiado `property: true` → `property: { select: { id, checkOutTime } }`

### 5. `scripts/create-missing-cleanings.ts`
- Cambiado `property: true` → `property: { select: { id, checkOutTime } }`

## Reglas de Oro para Prevenir P2022

### ✅ SIEMPRE usar `select` explícito en includes

```typescript
// ✅ CORRECTO
include: {
  property: {
    select: {
      id: true,
      name: true,
      // Solo campos necesarios
    },
  },
}

// ❌ EVITAR
include: {
  property: true, // Trae todo, puede causar P2022
}
```

### ✅ Regenerar Prisma Client después de cambios

```bash
# Después de cambiar schema.prisma
npx prisma generate

# O si usas migraciones
npx prisma migrate dev
```

### ✅ Verificar queries antes de deploy

Si una query falla con P2022:
1. Verifica que el Prisma Client esté actualizado: `npx prisma generate`
2. Verifica que el schema y la BD estén alineados: `npx prisma db pull --print`
3. Cambia `include: { relation: true }` a `include: { relation: { select: { ... } } }`

## Checklist para Nuevas Queries

- [ ] ¿Uso `select` explícito en todos los `include`?
- [ ] ¿Solo incluyo los campos que realmente necesito?
- [ ] ¿Regeneré el Prisma Client después de cambios en schema?
- [ ] ¿Verifiqué que el schema y la BD estén alineados?

## Comandos Útiles

```bash
# Regenerar Prisma Client
npx prisma generate

# Ver schema actual de la BD
npx prisma db pull --print

# Validar schema sin aplicar cambios
npx prisma validate

# Formatear schema
npx prisma format
```

## Notas Adicionales

- El error P2022 puede aparecer incluso si el schema parece correcto, si el Prisma Client está desactualizado.
- Siempre regenera el Prisma Client después de cambios en `schema.prisma`.
- Prefiere `select` sobre `include: { relation: true }` para mejor control y rendimiento.

