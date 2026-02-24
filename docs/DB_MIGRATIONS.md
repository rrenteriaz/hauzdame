# DB Migrations Playbook - Hausdame

## 📋 Resumen

Este documento describe el flujo correcto para gestionar migraciones de Prisma en Hausdame, diseñado para prevenir drift entre el schema y la base de datos real.

## 🎯 Comandos Principales

### Desarrollo Local

```bash
# Crear nueva migración (desarrollo)
npm run db:dev

# Ver estado de migraciones
npm run db:status

# Ejecutar sanity check
npm run db:sanity
```

### Producción

```bash
# Aplicar migraciones pendientes (producción)
npm run db:deploy

# Verificar estado antes de deploy
npm run db:status

# Ejecutar sanity check (recomendado en CI/CD)
npm run db:sanity
```

### Auditoría (Solo Lectura)

```bash
# Sincronizar schema desde DB (SOLO para auditoría)
npm run db:pull:audit
```

⚠️ **IMPORTANTE**: `db:pull:audit` solo debe usarse para verificar qué existe en la DB. **NO** debe usarse para generar migraciones.

## 🚫 Comandos Prohibidos (Salvo Emergencia)

### `prisma migrate resolve`

**NO usar** `prisma migrate resolve --applied` sin ejecutar el SQL primero.

**Riesgo**: Marca migraciones como aplicadas sin ejecutarlas, causando drift severo.

**Excepción**: Solo en emergencias documentadas, después de ejecutar el SQL manualmente.

### `prisma db push`

**NO usar** en producción. Solo para prototipado rápido en desarrollo.

**Riesgo**: No crea migraciones versionadas, dificulta rollback y tracking.

## ✅ Flujo Correcto

### Crear Nueva Migración (Desarrollo)

1. **Modificar schema**: Editar `prisma/schema.prisma`
2. **Crear migración**: `npm run db:dev`
   - Prisma generará el SQL y lo aplicará automáticamente
   - Se creará un archivo en `prisma/migrations/`
3. **Verificar**: `npm run db:sanity`
4. **Commit**: Incluir tanto el schema como la migración en el commit

### Aplicar Migraciones (Producción)

1. **Verificar estado**: `npm run db:status`
2. **Ejecutar sanity check**: `npm run db:sanity`
3. **Aplicar migraciones**: `npm run db:deploy`
4. **Verificar post-deploy**: `npm run db:sanity`

### Verificar DB Target

Antes de ejecutar migraciones, siempre verificar que `DATABASE_URL` apunta a la DB correcta:

```bash
# El sanity check muestra la URL censurada
npm run db:sanity
```

O manualmente:

```bash
# Ver host/database (sin exponer credenciales)
node -e "const u = new URL(process.env.DATABASE_URL); console.log(u.hostname, u.pathname);"
```

## 🔍 Sanity Check

El script `db:sanity` valida:

- ✅ Tabla `TeamMembership` existe
- ✅ Tabla `TeamInvite` existe
- ✅ Columna `Cleaning.assignedMembershipId` existe
- ✅ Migraciones no tienen `applied_steps_count=0` con `finished_at` no null

**En producción**: Si falla, el script termina con `exit(1)`.

**En desarrollo**: Si hay warnings, el script termina con `exit(0)` pero muestra advertencias.

## 🌐 Configuración de Shadow Database para Neon

### Problema

Neon requiere una shadow database para `prisma migrate dev`. Por defecto, Prisma intenta crear una base de datos temporal, pero Neon puede tener restricciones que impiden esto.

**Error común**:
```
Error: P3006
Migration `[nombre]` failed to apply cleanly to the shadow database.
Error code: P1014
The underlying table for model `Tenant` does not exist.
```

### Solución: SHADOW_DATABASE_URL

Configurar una base de datos dedicada o un branch de Neon como shadow database.

#### Opción 1: Branch de Neon (Recomendado)

1. **Crear branch desde el dashboard de Neon**:
   - Ir a tu proyecto en [Neon Console](https://console.neon.tech)
   - Click en "Branches" → "Create Branch"
   - Nombre: `shadow` (o cualquier nombre)
   - Copiar la connection string del branch

2. **Agregar en `.env`**:
   ```bash
   SHADOW_DATABASE_URL="postgresql://[usuario]:[password]@[host]/[database]?sslmode=require"
   ```

3. **Aplicar todas las migraciones al branch** (solo la primera vez):
   ```bash
   # Aplicar migraciones existentes al branch shadow
   DATABASE_URL=$SHADOW_DATABASE_URL npm run db:deploy
   ```

4. **Ejecutar migrate dev**:
   ```bash
   npm run db:dev
   ```

#### Opción 2: Base de Datos Adicional (Alternativa)

Si prefieres usar una base de datos completamente separada:

1. **Crear nueva base de datos en Neon**:
   - Desde el dashboard, crear una nueva base de datos
   - Nombre: `hausdame_shadow` (o cualquier nombre)
   - Copiar la connection string

2. **Agregar en `.env`**:
   ```bash
   SHADOW_DATABASE_URL="postgresql://[usuario]:[password]@[host]/hausdame_shadow?sslmode=require"
   ```

3. **Aplicar migraciones al shadow** (solo la primera vez):
   ```bash
   DATABASE_URL=$SHADOW_DATABASE_URL npm run db:deploy
   ```

4. **Ejecutar migrate dev**:
   ```bash
   npm run db:dev
   ```

### Mantener Shadow Database Actualizada

**Importante**: Cuando agregues nuevas migraciones, la shadow database debe estar sincronizada. Si hay drift:

```bash
# Aplicar migraciones pendientes al shadow
DATABASE_URL=$SHADOW_DATABASE_URL npm run db:deploy
```

### Verificar Configuración

Para verificar que `SHADOW_DATABASE_URL` está configurado:

```bash
# Verificar que la variable existe (sin exponer credenciales)
node -e "const u = new URL(process.env.SHADOW_DATABASE_URL || ''); console.log('Shadow DB:', u.hostname, u.pathname);"
```

### Notas

- **No usar en producción**: La shadow database solo se usa en desarrollo para `migrate dev`
- **En producción**: Usar `migrate deploy` que no requiere shadow database
- **Branch vs Base separada**: Los branches en Neon son más eficientes (comparten almacenamiento) y son la opción recomendada

## 🐛 Troubleshooting

### Drift Detectado (applied_steps_count=0)

**Síntoma**: `db:sanity` reporta migraciones con `finished_at` no null pero `applied_steps_count=0`.

**Causa común**: Se usó `migrate resolve --applied` sin ejecutar el SQL.

**Solución**:

1. **NO usar** `migrate resolve --rolled-back` (no funciona si no está en estado failed)
2. **Ejecutar SQL manualmente** usando `prisma db execute`:
   ```bash
   Get-Content prisma/migrations/[migration_name]/migration.sql | npx prisma db execute --stdin
   ```
3. **Verificar**: `npm run db:sanity`
4. **Documentar**: Registrar en el historial qué migración se reparó y por qué

### Schema y DB Desincronizados

**Síntoma**: `prisma db pull` elimina modelos del schema (ej: `TeamMembership`).

**Causa**: El schema tiene modelos que no existen en la DB.

**Solución**:

1. **Verificar DB real**: `npm run db:sanity`
2. **Si faltan estructuras**: Aplicar migraciones pendientes o ejecutar SQL manualmente
3. **NO** confiar solo en `db pull` - siempre verificar con `db:sanity`

### Migraciones Marcadas como Aplicadas pero No Ejecutadas

**Síntoma**: `migrate status` dice "up to date" pero `db:sanity` falla.

**Solución**:

1. Ejecutar el SQL de la migración usando `prisma db execute --stdin`
2. Verificar con `db:sanity`
3. **NO** marcar como aplicada si no se ejecutó el SQL

## 📚 Referencias

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Migrate Troubleshooting](https://www.prisma.io/docs/guides/migrate/troubleshooting-development)

## 🔐 Seguridad

- **Nunca** exponer `DATABASE_URL` completa en logs
- Usar `db:sanity` para ver URL censurada
- Verificar siempre el target antes de ejecutar migraciones destructivas

## 📝 Checklist Pre-Deploy

- [ ] `npm run db:status` muestra estado esperado
- [ ] `npm run db:sanity` pasa sin errores
- [ ] `DATABASE_URL` apunta a la DB correcta
- [ ] Migraciones están en el repositorio
- [ ] Schema está sincronizado con migraciones

