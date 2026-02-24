// lib/media/getCleaningPhotos.ts
/**
 * Helper para obtener las fotos de una limpieza
 */

import prisma from "@/lib/prisma";

export interface CleaningPhotoData {
  id: string;
  assetId: string;
  url: string;
  takenAt: Date | null;
  uploadedAt: Date;
  sortOrder: number;
}

/**
 * Obtiene todas las fotos activas de una limpieza
 */
export async function getCleaningPhotos(
  cleaningId: string,
  tenantId: string
): Promise<CleaningPhotoData[]> {
  const cleaningMedia = await (prisma as any).cleaningMedia.findMany({
    where: {
      cleaningId,
      tenantId,
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
  });

  return cleaningMedia.map((cm: any) => ({
    id: cm.id,
    assetId: cm.asset.id,
    url: cm.asset.publicUrl || "",
    takenAt: cm.asset.takenAt,
    uploadedAt: cm.asset.uploadedAt,
    sortOrder: cm.sortOrder,
  }));
}

