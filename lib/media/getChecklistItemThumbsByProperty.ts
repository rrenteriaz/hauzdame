// lib/media/getChecklistItemThumbsByProperty.ts
/**
 * Helper para obtener thumbs de imágenes de checklist items desde un propertyId
 * Útil para hacer match con CleaningChecklistItem (snapshots) que no tienen relación directa
 * 
 * Retorna un Record serializable con clave compuesta (area, title, sortOrder) -> Array<string | null>
 */

import prisma from "@/lib/prisma";
import { getChecklistItemImageThumbsBatch } from "./getChecklistItemImageThumbs";
import { normalizeKey, buildMatchKey } from "./checklistItemThumbsKeys";

/**
 * Obtiene thumbs de imágenes para todos los PropertyChecklistItem activos de una propiedad
 * Retorna un Record serializable con clave compuesta para hacer match con snapshots
 * 
 * @param propertyId - ID de la propiedad
 * @param tenantId - ID del tenant
 * @returns Record con clave `${normalize(area)}|${normalize(title)}|${sortOrder}` -> Array<string | null> (thumbs)
 */
export async function getChecklistItemThumbsByProperty(
  propertyId: string,
  tenantId: string
): Promise<Record<string, Array<string | null>>> {
  // Obtener todos los PropertyChecklistItem activos de la propiedad
  const propertyItems = await (prisma as any).propertyChecklistItem.findMany({
    where: {
      propertyId,
      tenantId,
      isActive: true,
    },
    select: {
      id: true,
      area: true,
      title: true,
      sortOrder: true,
    },
  });

  if (propertyItems.length === 0) {
    return {};
  }

  // Obtener thumbs batch para todos los items
  const itemIds = propertyItems.map((item: any) => item.id);
  const thumbsMap = await getChecklistItemImageThumbsBatch(itemIds);

  // Crear objeto serializable usando clave compuesta normalizada (area, title, sortOrder)
  const thumbsByKey: Record<string, Array<string | null>> = {};
  
  for (const item of propertyItems) {
    const key = buildMatchKey(item.area, item.title, item.sortOrder);
    const thumbs = thumbsMap.get(item.id) || [null, null, null];
    thumbsByKey[key] = thumbs;
  }

  return thumbsByKey;
}

