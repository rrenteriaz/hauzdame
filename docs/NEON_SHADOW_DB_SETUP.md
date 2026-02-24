# Configuración de Shadow Database para Neon - Guía Rápida

## 🎯 Objetivo

Configurar `SHADOW_DATABASE_URL` para que `prisma migrate dev` funcione correctamente en Neon.

## ⚡ Setup Rápido (Branch Recomendado)

### Paso 1: Crear Branch en Neon

1. Ir a [Neon Console](https://console.neon.tech)
2. Seleccionar tu proyecto
3. Click en "Branches" → "Create Branch"
4. Nombre: `shadow` (o `dev-shadow`)
5. Copiar la **Connection String** del branch

### Paso 2: Configurar Variable de Entorno

Agregar en `.env`:

```bash
SHADOW_DATABASE_URL="postgresql://[usuario]:[password]@[host]/[database]?sslmode=require"
```

**Importante**: Reemplazar `[usuario]`, `[password]`, `[host]`, `[database]` con los valores del branch.

### Paso 3: Sincronizar Shadow Database (Primera Vez)

Aplicar todas las migraciones existentes al branch shadow:

```bash
# En PowerShell (Windows)
$env:DATABASE_URL=$env:SHADOW_DATABASE_URL; npm run db:deploy

# En Bash (Linux/Mac)
DATABASE_URL=$SHADOW_DATABASE_URL npm run db:deploy
```

### Paso 4: Ejecutar Migración

Ahora `migrate dev` debería funcionar:

```bash
npm run db:dev
```

## 🔄 Mantener Shadow Database Actualizada

Si agregas nuevas migraciones y la shadow database queda desincronizada:

```bash
# Sincronizar shadow database
$env:DATABASE_URL=$env:SHADOW_DATABASE_URL; npm run db:deploy
```

O simplemente ejecutar `migrate dev` - Prisma intentará sincronizar automáticamente.

## 🐛 Troubleshooting

### Error: "The underlying table for model `Tenant` does not exist"

**Causa**: La shadow database no tiene las migraciones aplicadas.

**Solución**: Aplicar migraciones al shadow (Paso 3 arriba).

### Error: "Permission denied" o "Cannot create database"

**Causa**: El usuario no tiene permisos para crear bases de datos (común en Neon).

**Solución**: Usar un branch en lugar de intentar crear una base nueva.

### Error: Shadow database URL not found

**Causa**: `SHADOW_DATABASE_URL` no está configurado o no se puede leer.

**Solución**: Verificar que el archivo `.env` tiene la variable y se carga correctamente.

## 📝 Notas

- Los branches en Neon comparten almacenamiento inicialmente, así que son más eficientes
- La shadow database solo se usa en desarrollo para `migrate dev`
- En producción, usar `migrate deploy` que no requiere shadow database
- No es necesario mantener datos en la shadow database - solo el schema

