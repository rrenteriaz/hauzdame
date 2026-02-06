# Notas de Integración - Sistema de Media

## Archivos Creados

### Route Handlers
- ✅ `app/api/media/upload/route.ts` - POST para subir imágenes
- ✅ `app/api/media/[id]/route.ts` - DELETE para eliminar imágenes

### Componentes UI
- ✅ `components/media/ImagePicker.tsx` - Selector de imagen (cámara/galería)
- ✅ `components/properties/PropertyCoverUploader.tsx` - Uploader de portada de propiedad
- ✅ `components/profile/AvatarUploader.tsx` - Uploader de avatar de usuario
- ✅ `components/cleanings/CleaningPhotos.tsx` - Gestor de fotos de limpieza

### Utilidades
- ✅ `lib/media/exif.ts` - Extracción de metadata EXIF (takenAt)

## Dependencias Requeridas

```bash
npm install exifr
```

## Integración en Páginas

### 1. PropertyCoverUploader
**Ubicación:** `app/host/properties/[id]/page.tsx` o página de edición de propiedad

```tsx
import PropertyCoverUploader from "@/components/properties/PropertyCoverUploader";

// En el componente, obtener coverMediaId y coverMedia.publicUrl
const property = await prisma.property.findFirst({
  where: { id },
  include: {
    coverMedia: {
      select: { id: true, publicUrl: true },
    },
  },
});

// Renderizar
<PropertyCoverUploader
  propertyId={property.id}
  currentCoverUrl={property.coverMedia?.publicUrl}
  currentCoverId={property.coverMedia?.id}
/>
```

### 2. AvatarUploader
**Ubicación:** Página de perfil de usuario (crear si no existe: `app/host/profile/page.tsx` o similar)

```tsx
import AvatarUploader from "@/components/profile/AvatarUploader";

// Obtener usuario con avatar
const user = await prisma.user.findFirst({
  where: { id: userId },
  include: {
    avatarMedia: {
      select: { id: true, publicUrl: true },
    },
  },
});

// Renderizar
<AvatarUploader
  userId={user.id}
  currentAvatarUrl={user.avatarMedia?.publicUrl}
  currentAvatarId={user.avatarMedia?.id}
  size="lg"
/>
```

### 3. CleaningPhotos
**Ubicación:** `app/host/cleanings/[id]/page.tsx` y `app/cleaner/cleanings/[id]/page.tsx`

```tsx
import CleaningPhotos from "@/components/cleanings/CleaningPhotos";

// Obtener fotos de la limpieza
const cleaning = await prisma.cleaning.findFirst({
  where: { id },
  include: {
    cleaningMedia: {
      where: {
        asset: {
          deletedAt: null,
        },
      },
      include: {
        asset: {
          select: {
            id: true,
            publicUrl: true,
            takenAt: true,
            uploadedAt: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    },
  },
});

// Determinar si puede editar
const canEdit = 
  (userRole === "OWNER" || userRole === "ADMIN") ||
  (cleaning.status !== "COMPLETED" && cleaning.status !== "CANCELLED" && isAssigned);

// Renderizar
<CleaningPhotos
  cleaningId={cleaning.id}
  canEdit={canEdit}
  initialPhotos={cleaning.cleaningMedia.map((cm) => ({
    id: cm.id,
    assetId: cm.asset.id,
    url: cm.asset.publicUrl || "",
    takenAt: cm.asset.takenAt?.toISOString() || null,
    uploadedAt: cm.asset.uploadedAt.toISOString(),
    sortOrder: cm.sortOrder,
  }))}
  maxPhotos={20}
/>
```

## Variables de Entorno Requeridas

```env
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

## Bucket de Supabase

Crear bucket "assets" en Supabase Storage:
- Configurar como privado (recomendado) o público
- Si es privado, generar signed URLs cuando se necesite mostrar imágenes

## Migración Prisma

Ejecutar migración después de actualizar schema:

```bash
npx prisma migrate dev --name add_media_support
npx prisma generate
```

## Notas Importantes

1. **Permisos**: Los route handlers actualmente usan `getDefaultTenant()` y no validan autenticación real. Implementar autenticación cuando esté disponible.

2. **Signed URLs**: Si el bucket es privado, crear endpoint `/api/media/[id]/url` para generar signed URLs temporales.

3. **Compresión**: Considerar agregar compresión de imágenes antes de subir (usar sharp en servidor o canvas en cliente).

4. **Thumbnails**: El sistema actual sube solo ORIGINAL. Considerar generar THUMB_256 automáticamente usando sharp.

5. **Límite de 20 fotos**: Validado en servidor. El componente muestra contador pero la validación real está en el API.

6. **EXIF**: Requiere `exifr` instalado. Si no está disponible, `takenAt` será null y se mostrará "Subida:" en lugar de "Tomada:".

