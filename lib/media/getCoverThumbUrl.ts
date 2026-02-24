// lib/media/getCoverThumbUrl.ts
/**
 * Helper para obtener la URL del thumbnail de portada de una propiedad
 * 
 * Prefiere THUMB_256, fallback a ORIGINAL, sino null
 */

import prisma from "@/lib/prisma";

export interface PropertyWithCoverAsset {
  coverAssetGroupId: string | null;
}

/**
 * Obtiene la URL del thumbnail de portada para una propiedad
 * Requiere que la propiedad tenga coverAssetGroupId
 */
export async function getCoverThumbUrl(
  property: PropertyWithCoverAsset
): Promise<string | null> {
  if (!property.coverAssetGroupId) {
    return null;
  }

  // Buscar el thumbnail (THUMB_256) primero, luego original
  const thumbAsset = await prisma.asset.findFirst({
    where: {
      groupId: property.coverAssetGroupId,
      variant: "THUMB_256",
    },
    select: {
      publicUrl: true,
    },
  });

  if (thumbAsset?.publicUrl) {
    return thumbAsset.publicUrl;
  }

  // Fallback a original
  const originalAsset = await prisma.asset.findFirst({
    where: {
      groupId: property.coverAssetGroupId,
      variant: "ORIGINAL",
    },
    select: {
      publicUrl: true,
    },
  });

  return originalAsset?.publicUrl || null;
}

/**
 * Batch: obtiene URLs de thumbnails para múltiples propiedades
 * Retorna un Map<propertyId, thumbUrl | null>
 */
export async function getCoverThumbUrlsBatch(
  properties: Array<{ id: string; coverAssetGroupId: string | null }>
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();

  // Filtrar propiedades sin coverAssetGroupId
  const withCover = properties.filter((p) => p.coverAssetGroupId);
  
  if (withCover.length === 0) {
    properties.forEach((p) => result.set(p.id, null));
    return result;
  }

  const groupIds = [...new Set(withCover.map((p) => p.coverAssetGroupId!))];

  // Buscar todos los assets (thumb primero, luego original)
  const allAssets = await prisma.asset.findMany({
    where: {
      groupId: { in: groupIds },
      variant: { in: ["THUMB_256", "ORIGINAL"] },
    },
    select: {
      groupId: true,
      variant: true,
      publicUrl: true,
    },
    orderBy: {
      variant: "asc", // THUMB_256 viene antes que ORIGINAL
    },
  });

  // Crear mapas por groupId (preferir thumb)
  const urlByGroupId = new Map<string, string>();
  for (const asset of allAssets) {
    if (!urlByGroupId.has(asset.groupId)) {
      urlByGroupId.set(asset.groupId, asset.publicUrl || "");
    }
  }

  // Asignar URLs a propiedades
  for (const property of properties) {
    if (property.coverAssetGroupId) {
      const url = urlByGroupId.get(property.coverAssetGroupId);
      result.set(property.id, url || null);
    } else {
      result.set(property.id, null);
    }
  }

  return result;
}

