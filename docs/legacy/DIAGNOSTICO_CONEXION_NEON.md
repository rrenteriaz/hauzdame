# Diagnóstico: Error de Conexión Prisma Migrate con Neon

## Problema

```
Error: P1001: Can't reach database server at `ep-billowing-queen-a4kq6dfg-pooler.us-east-1.aws.neon.tech:6543`
```

## Diagnóstico Realizado

✅ **Conexión directa con Neon funciona** (probada con script de diagnóstico)
✅ **Variables de entorno correctas** (`DATABASE_URL` y `SHADOW_DATABASE_URL` presentes)
❌ **Prisma Migrate falla** con la URL del pooler (puerto 6543)

## Causa

Neon proporciona dos tipos de conexiones:
- **Pooler** (puerto 6543): Optimizado para conexiones rápidas de aplicaciones
- **Directa** (puerto 5432): Requerida para migraciones y operaciones DDL

Prisma Migrate necesita la conexión directa porque:
- Requiere transacciones largas
- Ejecuta comandos DDL (CREATE TABLE, ALTER, etc.)
- El pooler puede tener limitaciones para estas operaciones

## Soluciones

### Opción 1: Usar URL Directa para Migraciones (Recomendado)

**Obtener la URL Directa:**
1. Ir a Neon Dashboard → tu proyecto → "Connection Details"
2. Seleccionar "Direct connection" (no "Connection pooling")
3. Copiar la URL (será similar pero sin `-pooler` y puerto `5432`)

**Temporalmente cambiar DATABASE_URL para migraciones:**

```bash
# En PowerShell, usar la URL directa solo para el comando de migración
$env:DATABASE_URL="postgresql://neondb_owner:npg_vK6ARMk7zLpX@ep-billowing-queen-a4kq6dfg.us-east-1.aws.neon.tech:5432/neondb?sslmode=require"
npx prisma migrate dev
```

**O crear variable separada para migraciones:**
```env
# .env
DATABASE_URL="postgresql://...-pooler...:6543/..." # Para runtime (aplicación)
MIGRATE_DATABASE_URL="postgresql://...:5432/..."   # Para migraciones
```

Y modificar `prisma.config.ts` para usar `MIGRATE_DATABASE_URL` si existe.

### Opción 2: Configurar Ambas URLs en .env

```env
# Para runtime (aplicación) - pooler
DATABASE_URL="postgresql://...-pooler...:6543/neondb?sslmode=require"

# Para migraciones - directa
MIGRATE_DATABASE_URL="postgresql://...:5432/neondb?sslmode=require"

# Shadow database (si aplica)
SHADOW_DATABASE_URL="postgresql://...:5432/shadow_db?sslmode=require"
```

### Opción 3: Modificar prisma.config.ts para Auto-Detectar

Actualizar `prisma.config.ts` para usar URL directa si está disponible:

```typescript
// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Para migraciones, preferir URL directa si existe
const migrateUrl = env("MIGRATE_DATABASE_URL") || env("DATABASE_URL")?.replace("-pooler", "").replace(":6543", ":5432");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: migrateUrl || env("DATABASE_URL"),
    shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});
```

## Verificación

Después de aplicar la solución, verificar:

```bash
# Verificar estado de migraciones
npx prisma migrate status

# Ejecutar migración
npx prisma migrate dev --name test_connection

# Generar Prisma Client
npx prisma generate
```

## Notas Importantes

1. **Runtime vs Migraciones:**
   - La aplicación puede seguir usando el pooler (más eficiente)
   - Solo las migraciones necesitan la conexión directa

2. **Shadow Database:**
   - También debe usar conexión directa (puerto 5432)
   - Puede ser la misma instancia pero diferente base de datos

3. **Seguridad:**
   - Ambas URLs deben incluir `?sslmode=require`
   - No commitar URLs con credenciales reales en el repositorio

## Referencias

- [Neon Connection Modes](https://neon.tech/docs/connect/connection-modes)
- [Prisma Migrate Shadow Database](https://www.prisma.io/docs/concepts/components/prisma-migrate/shadow-database)

