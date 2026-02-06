# Sistema de Imágenes de Portada - Setup

## Instalación de Dependencias

```bash
npm install @supabase/supabase-js sharp
npm install --save-dev @types/sharp
```

## Variables de Entorno

Agregar a `.env` o `.env.local`:

```env
# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
# O usar ANON_KEY si prefieres:
# SUPABASE_ANON_KEY=tu_anon_key
```

## Crear Bucket en Supabase

1. Ir a Supabase Dashboard > Storage
2. Crear bucket: `property-covers`
3. Configurar como **público** (para acceso público sin URLs firmadas)
4. Configurar políticas RLS si es necesario (o deshabilitar RLS para acceso público)

## Migración de Base de Datos

Ejecutar migración de Prisma:

```bash
npx prisma migrate dev --name add_asset_model_and_property_cover
```

Esto creará:
- Enums: `AssetType`, `AssetProvider`, `AssetVariant`
- Modelo `Asset`
- Campo `coverAssetGroupId` en `Property`
- Índices necesarios

## Arquitectura

### Asset + groupId

Se usa `groupId` (UUID) para agrupar variantes del mismo upload:
- `ORIGINAL`: imagen original
- `THUMB_256`: thumbnail de 256px

Esto permite:
- Mantener relación simple en Property (solo un `coverAssetGroupId`)
- Poder agregar más variantes en el futuro sin cambiar el modelo
- Limpiar todos los assets relacionados fácilmente

### Storage Provider Interface

La interfaz `StorageProvider` permite cambiar de Supabase a AWS S3 sin tocar la UI:

1. Crear `lib/storage/awsS3Storage.ts` implementando `StorageProvider`
2. Cambiar `lib/storage/index.ts` para exportar el nuevo provider
3. Actualizar variables de entorno

La UI y lógica de negocio no requieren cambios.

## Uso

### Subir Portada

El componente `CoverImageSection` maneja:
- Preview local antes de subir
- Validación de tipo y tamaño (5MB max)
- Upload con generación automática de thumbnail
- Actualización de Property.coverAssetGroupId

### Eliminar Portada

Elimina:
- Assets de la base de datos (original + thumb)
- Archivos del storage
- Actualiza Property.coverAssetGroupId a null

### En Listas

Usar `getCoverThumbUrlsBatch()` para obtener URLs de múltiples propiedades eficientemente.

## Notas

- Las imágenes se almacenan en: `{tenantId}/{propertyId}/{groupId}/{variant}.{ext}`
- Thumbnails se generan en WebP cuando es posible (mejor compresión)
- Límites: 5MB por archivo, formatos: JPG/PNG/WebP

