# Comandos Ejecutados - Setup Sistema de Imágenes

## Dependencias Instaladas

```bash
npm install @supabase/supabase-js sharp
```

**Resultado:** ✅ Exitoso
- `@supabase/supabase-js` agregado
- `sharp` agregado (8 packages adicionales)

## Prisma

### Configuración Shadow Database

**Archivo:** `prisma/schema.prisma`
```prisma
datasource db {
  provider        = "postgresql"
  url             = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

**Archivo:** `prisma.config.ts`
```typescript
datasource: {
  url: env("DATABASE_URL"),
  shadowDatabaseUrl: env("SHADOW_DATABASE_URL", { optional: true }),
}
```

### Migración (PENDIENTE - Requiere Shadow DB)

```bash
# PRIMERO: Configurar SHADOW_DATABASE_URL en .env
# Luego ejecutar:

npx prisma migrate dev --name add_asset_model_and_property_cover

# Después de migración exitosa:

npx prisma generate
```

**Resultado Esperado:**
- Migración creada con modelo Asset
- Campo `coverAssetGroupId` agregado a Property
- Prisma Client regenerado con tipos actualizados

## Variables de Entorno Requeridas

Agregar a `.env`:

```env
# Database (existente)
DATABASE_URL="postgresql://..."

# Shadow Database (NUEVO - requerido para migrate dev)
SHADOW_DATABASE_URL="postgresql://user:password@host:5432/shadow_database"

# Supabase Storage (NUEVO - server-only)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## Verificación

### Lint
```bash
npm run lint
```
**Resultado:** ✅ Sin errores nuevos (errores preexistentes de @typescript-eslint/no-explicit-any)

### TypeScript Check
```bash
npx tsc --noEmit
```
**Nota:** Ejecutar después de `prisma generate` para verificar tipos completos

## Checklist Final

- [ ] SHADOW_DATABASE_URL configurada en .env
- [ ] Migración ejecutada exitosamente
- [ ] Prisma Client regenerado
- [ ] SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY configurados
- [ ] Bucket `property-covers` creado en Supabase (público)
- [ ] Upload de portada funciona
- [ ] Thumbnails aparecen en listas
- [ ] Eliminación de portada funciona

