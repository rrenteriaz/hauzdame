# Checklist de Setup - Sistema de Imágenes de Portada

## ✅ Completado

### Dependencias
- [x] `@supabase/supabase-js` instalado
- [x] `sharp` instalado
- [x] Variables de entorno actualizadas (server-only, sin NEXT_PUBLIC_)

### Prisma
- [x] Schema actualizado con modelo Asset y enums
- [x] Campo `coverAssetGroupId` agregado a Property
- [x] Shadow database configurado en schema.prisma

### Código
- [x] Storage provider interface implementado
- [x] SupabaseStorageProvider implementado
- [x] Server actions (uploadCoverImage, removeCoverImage) creados
- [x] Helper getCoverThumbUrlsBatch implementado
- [x] Queries de listas actualizadas para incluir coverAssetGroupId
- [x] ListThumb alimentado con thumbnails en todas las listas

## ⏳ Pendiente (Requiere Acción Manual)

### 1. Configurar Shadow Database

**Para Neon:**
```bash
# Crear una nueva base de datos en Neon Dashboard (ej: hausdame_shadow)
# O usar un branch temporal
```

**Agregar a .env:**
```env
SHADOW_DATABASE_URL="postgresql://user:password@host:5432/shadow_database"
```

**Para Postgres local:**
```bash
createdb hausdame_shadow
```

```env
SHADOW_DATABASE_URL="postgresql://user:password@localhost:5432/hausdame_shadow"
```

### 2. Ejecutar Migración Prisma

```bash
npx prisma migrate dev --name add_asset_model_and_property_cover
```

**Si falla:**
- Verificar que SHADOW_DATABASE_URL esté configurada
- Verificar que la shadow database esté vacía
- Verificar permisos de conexión

**Después de migración exitosa:**
```bash
npx prisma generate
```

### 3. Configurar Supabase

#### Variables de Entorno (.env)
```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

**Importante:** NO usar prefijo `NEXT_PUBLIC_` para credenciales sensibles.

#### Crear Bucket en Supabase

1. Ir a Supabase Dashboard > Storage
2. Click en "New bucket"
3. Nombre: `property-covers`
4. **Público:** ✅ (checked)
5. Click "Create bucket"

**Configurar Políticas RLS (si aplica):**
- Para acceso público, puede que necesites deshabilitar RLS o crear políticas que permitan lectura pública

### 4. Verificación End-to-End

#### Subir Portada
1. Ir a `/host/properties/[id]`
2. Click "Subir portada"
3. Seleccionar imagen (JPG/PNG/WebP, máx 5MB)
4. Verificar:
   - ✅ Preview local aparece
   - ✅ Se sube correctamente
   - ✅ Aparece en detalle de propiedad
   - ✅ Thumbnail aparece en listas

#### Ver en Listas
1. Ir a `/host/properties`
2. Verificar que thumbnails aparecen en lugar de fallback Hausdame
3. Revisar otras listas:
   - `/host/reservations`
   - `/host/cleanings` (próximas limpiezas)
   - `/host/cleanings/history`
   - `/cleaner` (limpiezas disponibles y mías)

#### Eliminar Portada
1. En detalle de propiedad, click "Eliminar"
2. Confirmar eliminación
3. Verificar:
   - ✅ Imagen desaparece del detalle
   - ✅ Listas vuelven a mostrar fallback Hausdame
   - ✅ Assets eliminados de DB
   - ✅ Archivos eliminados del storage

### 5. Comandos de Verificación

```bash
# Verificar que no hay errores de TypeScript
npx tsc --noEmit

# Verificar lint
npm run lint

# Build (si aplica)
npm run build
```

## Resolución de Problemas

### Error: "Shadow database not found"
- Verificar SHADOW_DATABASE_URL en .env
- Crear la base de datos si no existe

### Error: "Supabase credentials not configured"
- Verificar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env
- Reiniciar servidor de desarrollo después de cambiar .env

### Error: "Failed to upload to Supabase"
- Verificar que el bucket `property-covers` existe
- Verificar que el bucket es público
- Verificar políticas RLS si aplica

### Thumbnails no aparecen en listas
- Verificar que coverAssetGroupId se está guardando en Property
- Verificar que Assets se están creando con groupId correcto
- Verificar que publicUrl se está guardando en Asset

