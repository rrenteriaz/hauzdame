# Prisma Migration Baseline - 2026-02-10

## Fecha del Corte
**2026-02-10**

## Contexto

Se realizó un re-baseline de las migraciones de Prisma para eliminar la dependencia de migraciones históricas (2025+) que causaban problemas con el shadow database de Prisma (`P3006`, `P1014`).

### Problemas que motivaron el baseline

1. **Shadow DB fallos**: Las migraciones históricas causaban errores al intentar aplicar desde una base de datos vacía (shadow DB)
2. **Drift histórico**: Migraciones editadas después de ser aplicadas causaban drift que impedía crear nuevas migraciones
3. **Dependencias complejas**: La cadena de migraciones tenía dependencias circulares y ordenamientos problemáticos (ej: `PropertyChecklistItem` referenciado antes de ser creado)

### Solución

Se creó un baseline único que representa el estado completo del schema actual, eliminando la necesidad de aplicar 51 migraciones históricas.

## Estructura Actual

```
prisma/migrations/
  └── 00000000000000_baseline/
      └── migration.sql  (schema completo generado desde schema.prisma)

archive/
  └── migrations_old_20260210/
      └── [51 migraciones históricas archivadas]
```

## Estado de la Base de Datos

- ✅ La base de datos actual **NO fue modificada**
- ✅ El baseline fue marcado como aplicado sin ejecutarlo (ya está en el estado correcto)
- ✅ Todas las migraciones históricas fueron archivadas en `archive/migrations_old_20260210/`

## Cómo Crear Entornos Nuevos desde Baseline

### Opción 1: Base de Datos Nueva (Local/Staging/Prod)

1. **Crear una base de datos nueva** (vacía)

2. **Aplicar el baseline**:
   ```bash
   # Asegurar que DATABASE_URL apunta a la nueva DB
   npx prisma migrate deploy
   ```

3. **Verificar**:
   ```bash
   npx prisma migrate status
   # Debe mostrar: "Database schema is up to date!"
   ```

### Opción 2: Neon Branch (Recomendado para Shadow DB)

1. **Crear un branch en Neon Console**:
   - Ir a Neon Dashboard → tu proyecto → "Branches"
   - Click "Create Branch"
   - Nombre: `dev-shadow` o `shadow`

2. **Configurar SHADOW_DATABASE_URL** en `.env`:
   ```env
   SHADOW_DATABASE_URL="postgresql://[usuario]:[password]@[host]/[database]?sslmode=require"
   ```

3. **Aplicar baseline al branch**:
   ```bash
   # Temporalmente usar el branch como DATABASE_URL
   $env:DATABASE_URL=$env:SHADOW_DATABASE_URL
   npx prisma migrate deploy
   ```

4. **Restaurar DATABASE_URL original** y continuar con desarrollo normal

## Migraciones Futuras

### Reglas Importantes

1. **NUNCA editar migraciones ya aplicadas**: Si necesitas corregir algo, crea una nueva migración
2. **Usar `migrate dev` para desarrollo**: Esto creará migraciones incrementales limpias
3. **Usar `migrate deploy` para producción**: Aplica migraciones pendientes sin modificar el schema

### Flujo de Trabajo Normal

```bash
# Desarrollo: crear nueva migración
npx prisma migrate dev --name nombre_descriptivo

# Producción: aplicar migraciones pendientes
npx prisma migrate deploy

# Verificar estado
npx prisma migrate status
```

## Verificación Post-Baseline

### En la Base de Datos Actual

```sql
-- Verificar que el baseline está marcado como aplicado
SELECT * FROM "_prisma_migrations" WHERE migration_name = '00000000000000_baseline';

-- Verificar que no hay migraciones pendientes
SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NULL;
-- Debe retornar 0
```

### En una Base de Datos Nueva

```bash
# Aplicar baseline
npx prisma migrate deploy

# Verificar schema
npx prisma db pull --print
# Comparar con schema.prisma actual
```

## Archivos Relacionados

- `prisma/schema.prisma`: Schema actual (fuente de verdad)
- `prisma/migrations/00000000000000_baseline/migration.sql`: Baseline SQL generado
- `prisma/baseline_schema.sql`: Copia del baseline SQL (referencia)
- `archive/migrations_old_20260210/`: Migraciones históricas archivadas

## Notas Adicionales

- El baseline incluye todos los modelos, enums, índices y constraints definidos en `schema.prisma`
- Incluye el modelo `GlobalCatalogItem` y todos los fixes previos
- El baseline fue generado usando `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`
- Las migraciones históricas están preservadas en `archive/` por si se necesita referencia histórica

## Troubleshooting

### Error: "Migration not found"
- Verificar que `prisma/migrations/00000000000000_baseline/migration.sql` existe
- Ejecutar `npx prisma migrate resolve --applied 00000000000000_baseline` si es necesario

### Error: "Database schema is out of sync"
- Ejecutar `npx prisma migrate deploy` para aplicar migraciones pendientes
- Si persiste, verificar que `schema.prisma` coincide con el estado real de la DB

### Error: Shadow DB issues
- Asegurar que `SHADOW_DATABASE_URL` está configurada
- Aplicar el baseline al shadow DB usando `migrate deploy` con la URL del shadow

---

**Última actualización**: 2026-02-10
