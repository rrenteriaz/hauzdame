# ETAPA 4.5.2 — Fix Shadow Database para Neon

## ✅ Diagnóstico Completo

### Error Identificado

```
Error: P3006
Migration `20250120000000_add_inventory_tables` failed to apply cleanly to the shadow database.
Error code: P1014
The underlying table for model `Tenant` does not exist.
```

**Causa**: Neon no permite crear bases de datos temporales para shadow database, o la shadow database no tiene el estado inicial correcto.

### Configuración Actual

✅ `prisma.config.ts` ya soporta `SHADOW_DATABASE_URL`:
- Línea 58: Lee `SHADOW_DATABASE_URL` de variables de entorno
- Línea 66: Pasa `shadowDatabaseUrl` a la configuración de Prisma si existe

✅ Documentación creada:
- `docs/DB_MIGRATIONS.md` - Actualizado con sección de Shadow Database
- `docs/NEON_SHADOW_DB_SETUP.md` - Guía rápida de setup

## 📋 Pasos para Resolver

### Paso 1: Crear Branch en Neon (Recomendado)

1. Ir a [Neon Console](https://console.neon.tech)
2. Seleccionar tu proyecto
3. Click en "Branches" → "Create Branch"
4. Nombre: `shadow` o `dev-shadow`
5. **Copiar la Connection String** del branch

### Paso 2: Configurar Variable de Entorno

Agregar en `.env`:

```bash
SHADOW_DATABASE_URL="postgresql://[usuario]:[password]@[host]/[database]?sslmode=require"
```

**Nota**: Reemplazar `[usuario]`, `[password]`, `[host]`, `[database]` con los valores del branch.

### Paso 3: Sincronizar Shadow Database (Primera Vez)

Aplicar todas las migraciones existentes al branch shadow:

**En PowerShell (Windows)**:
```powershell
$env:DATABASE_URL=$env:SHADOW_DATABASE_URL; npm run db:deploy
```

**En Bash (Linux/Mac)**:
```bash
DATABASE_URL=$SHADOW_DATABASE_URL npm run db:deploy
```

### Paso 4: Ejecutar Migración

Ahora `migrate dev` debería funcionar:

```bash
npm run db:dev --name etapa4_5_2_marketplace_models
```

### Paso 5: Verificar

```bash
npm run db:status
npm run db:sanity
```

## 🔄 Mantenimiento

Si la shadow database queda desincronizada (después de agregar nuevas migraciones):

```powershell
# En PowerShell
$env:DATABASE_URL=$env:SHADOW_DATABASE_URL; npm run db:deploy
```

O simplemente ejecutar `migrate dev` - Prisma intentará sincronizar automáticamente.

## 📚 Documentación

- **Guía Completa**: `docs/DB_MIGRATIONS.md` - Sección "Configuración de Shadow Database para Neon"
- **Guía Rápida**: `docs/NEON_SHADOW_DB_SETUP.md` - Setup paso a paso

## ⚠️ Notas Importantes

- **No usar en producción**: La shadow database solo se usa en desarrollo para `migrate dev`
- **En producción**: Usar `migrate deploy` que no requiere shadow database
- **Branch vs Base separada**: Los branches en Neon son más eficientes (comparten almacenamiento) y son la opción recomendada
- **Primera vez**: Debes sincronizar la shadow database aplicando todas las migraciones existentes

