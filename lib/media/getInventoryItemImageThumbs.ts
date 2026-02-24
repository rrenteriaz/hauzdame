// lib/media/getInventoryItemImageThumbs.ts
/**
 * Helper para obtener las URLs de thumbnails de imágenes de un InventoryItem
 * 
 * Retorna hasta 3 thumbs ordenadas por posición (1, 2, 3)
 */

import prisma from "@/lib/prisma";

/**
 * Obtiene las URLs de thumbnails para un InventoryItem
 * Retorna un array de hasta 3 URLs (una por posición), ordenadas por posición
 * 
 * @param itemId - ID del InventoryItem
 * @returns Array de URLs de thumbnails (puede tener nulls si no hay imagen en esa posición)
 */
export async function getInventoryItemImageThumbs(
  itemId: string
): Promise<Array<string | null>> {
  // Obtener todos los InventoryItemAsset para este item, ordenados por posición
  const itemAssets = await prisma.inventoryItemAsset.findMany({
    where: {
      itemId,
    },
    include: {
      asset: {
        select: {
          id: true,
          groupId: true,
          variant: true,
        },
      },
    },
    orderBy: {
      position: "asc",
    },
  });

  if (itemAssets.length === 0) {
    return [null, null, null];
  }

  // Obtener los groupIds únicos
  const groupIds = [...new Set(itemAssets.map((ia) => ia.asset.groupId))];

  // Buscar todos los assets (thumb primero, luego original como fallback)
  const allAssets = await prisma.asset.findMany({
    where: {
      groupId: { in: groupIds },
      variant: { in: ["THUMB_256", "ORIGINAL"] },
    },
    select: {
      id: true,
      groupId: true,
      variant: true,
      publicUrl: true,
    },
    orderBy: {
      variant: "asc", // THUMB_256 viene antes que ORIGINAL
    },
  });

  // Crear mapa de groupId -> URL (preferir thumb)
  const urlByGroupId = new Map<string, string>();
  for (const asset of allAssets) {
    if (!urlByGroupId.has(asset.groupId)) {
      urlByGroupId.set(asset.groupId, asset.publicUrl || "");
    }
  }

  // Crear mapa de assetId -> URL (para lookup rápido)
  const urlByAssetId = new Map<string, string>();
  for (const asset of allAssets) {
    if (asset.publicUrl) {
      urlByAssetId.set(asset.id, asset.publicUrl);
    }
  }

  // Construir resultado: array de 3 posiciones (1, 2, 3)
  const result: Array<string | null> = [null, null, null];

  for (const itemAsset of itemAssets) {
    const position = itemAsset.position;
    if (position >= 1 && position <= 3) {
      // Buscar URL por assetId directo o por groupId
      const url =
        urlByAssetId.get(itemAsset.assetId) ||
        urlByGroupId.get(itemAsset.asset.groupId) ||
        null;
      result[position - 1] = url; // position 1 -> index 0, position 2 -> index 1, etc.
    }
  }

  return result;
}

/**
 * Batch: obtiene URLs de thumbnails para múltiples InventoryItems
 * Retorna un Map<itemId, Array<string | null>> donde el array tiene hasta 3 URLs ordenadas
 * 
 * @param itemIds - Array de IDs de InventoryItems
 * @returns Map con las URLs de thumbnails por item
 */
export async function getInventoryItemImageThumbsBatch(
  itemIds: string[]
): Promise<Map<string, Array<string | null>>> {
  const result = new Map<string, Array<string | null>>();

  if (itemIds.length === 0) {
    return result;
  }

  // Inicializar todos los items con [null, null, null]
  itemIds.forEach((id) => result.set(id, [null, null, null]));

  // Obtener todos los InventoryItemAsset para estos items
  const itemAssets = await prisma.inventoryItemAsset.findMany({
    where: {
      itemId: { in: itemIds },
    },
    include: {
      asset: {
        select: {
          id: true,
          groupId: true,
          variant: true,
        },
      },
    },
    orderBy: {
      position: "asc",
    },
  });

  if (itemAssets.length === 0) {
    return result;
  }

  // Obtener los groupIds únicos
  const groupIds = [...new Set(itemAssets.map((ia) => ia.asset.groupId))];

  // Buscar todos los assets (thumb primero, luego original como fallback)
  const allAssets = await prisma.asset.findMany({
    where: {
      groupId: { in: groupIds },
      variant: { in: ["THUMB_256", "ORIGINAL"] },
    },
    select: {
      id: true,
      groupId: true,
      variant: true,
      publicUrl: true,
    },
    orderBy: {
      variant: "asc", // THUMB_256 viene antes que ORIGINAL
    },
  });

  // Crear mapa de groupId -> URL (preferir thumb)
  const urlByGroupId = new Map<string, string>();
  for (const asset of allAssets) {
    if (!urlByGroupId.has(asset.groupId)) {
      urlByGroupId.set(asset.groupId, asset.publicUrl || "");
    }
  }

  // Crear mapa de assetId -> URL (para lookup rápido)
  const urlByAssetId = new Map<string, string>();
  for (const asset of allAssets) {
    if (asset.publicUrl) {
      urlByAssetId.set(asset.id, asset.publicUrl);
    }
  }

  // Agrupar itemAssets por itemId
  const itemAssetsByItemId = new Map<string, typeof itemAssets>();
  for (const itemAsset of itemAssets) {
    if (!itemAssetsByItemId.has(itemAsset.itemId)) {
      itemAssetsByItemId.set(itemAsset.itemId, []);
    }
    itemAssetsByItemId.get(itemAsset.itemId)!.push(itemAsset);
  }

  // Construir resultado para cada item
  for (const [itemId, assets] of itemAssetsByItemId) {
    const thumbs: Array<string | null> = [null, null, null];

    for (const itemAsset of assets) {
      const position = itemAsset.position;
      if (position >= 1 && position <= 3) {
        // Buscar URL por assetId directo o por groupId
        const url =
          urlByAssetId.get(itemAsset.assetId) ||
          urlByGroupId.get(itemAsset.asset.groupId) ||
          null;
        thumbs[position - 1] = url; // position 1 -> index 0, position 2 -> index 1, etc.
      }
    }

    result.set(itemId, thumbs);
  }

  return result;
}

