// app/host/inventory/image-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import storageProvider from "@/lib/storage";
import { generateThumbnail, getOutputMimeType } from "@/lib/media/thumbnail";
import { randomUUID } from "crypto";
import sharp from "sharp";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const BUCKET_NAME = "inventory-item-images";

/**
 * Upload de imagen para un InventoryItem
 * 
 * @param formData - Debe contener: itemId, position (1-3), file
 * @returns { position, groupId, thumbUrl, originalUrl, assetIds: [originalId, thumbId] }
 */
export async function uploadInventoryItemImageAction(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No tenant found");
  }

  const itemId = formData.get("itemId")?.toString();
  const positionStr = formData.get("position")?.toString();
  const file = formData.get("file") as File | null;

  // Validaciones básicas
  if (!itemId) {
    throw new Error("itemId es requerido");
  }

  if (!positionStr) {
    throw new Error("position es requerido");
  }

  const position = parseInt(positionStr, 10);
  if (isNaN(position) || position < 1 || position > 3) {
    throw new Error("position debe ser 1, 2 o 3");
  }

  if (!file) {
    throw new Error("file es requerido");
  }

  // Validar tipo de archivo
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Tipo de archivo no permitido. Use JPG, PNG o WebP.");
  }

  // Validar tamaño
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("El archivo es demasiado grande. Máximo 5MB.");
  }

  // Verificar que el item existe y pertenece al tenant
  const item = await prisma.inventoryItem.findFirst({
    where: {
      id: itemId,
      tenantId: tenant.id,
    },
  });

  if (!item) {
    throw new Error("InventoryItem no encontrado o no pertenece a tu cuenta");
  }

  // Si ya existe una imagen en esta posición, obtener el assetId actual para referencia
  const existingItemAsset = await prisma.inventoryItemAsset.findFirst({
    where: {
      tenantId: tenant.id,
      itemId,
      position,
    },
    select: {
      assetId: true,
    },
  });

  // Generar groupId (UUID) para agrupar original + thumbnail
  const groupId = randomUUID();

  // Obtener metadata de la imagen original
  const originalMetadata = await sharp(buffer).metadata();
  const originalWidth = originalMetadata.width || 0;
  const originalHeight = originalMetadata.height || 0;

  // Generar thumbnail
  const thumbnailResult = await generateThumbnail(buffer, file.type);

  // Construir keys para storage
  const fileExtension = file.name.split(".").pop() || "jpg";
  const originalKey = `${tenant.id}/inventory-items/${itemId}/${groupId}/original.${fileExtension}`;
  const thumbKey = `${tenant.id}/inventory-items/${itemId}/${groupId}/thumb_256.${thumbnailResult.format}`;

  try {
    // Subir original
    const originalUpload = await storageProvider.putPublicObject({
      bucket: BUCKET_NAME,
      key: originalKey,
      contentType: file.type,
      buffer,
    });

    // Subir thumbnail
    const thumbUpload = await storageProvider.putPublicObject({
      bucket: BUCKET_NAME,
      key: thumbKey,
      contentType: getOutputMimeType(thumbnailResult.format),
      buffer: thumbnailResult.buffer,
    });

    // Crear registros Asset en la base de datos y actualizar/crear InventoryItemAsset
    const result = await prisma.$transaction(async (tx) => {
      // Crear Asset original
      const originalAsset = await tx.asset.create({
        data: {
          tenantId: tenant.id,
          type: "IMAGE",
          provider: "SUPABASE",
          variant: "ORIGINAL",
          bucket: BUCKET_NAME,
          key: originalKey,
          publicUrl: originalUpload.publicUrl,
          mimeType: file.type,
          sizeBytes: buffer.length,
          width: originalWidth,
          height: originalHeight,
          groupId,
        },
      });

      // Crear Asset thumbnail
      const thumbAsset = await tx.asset.create({
        data: {
          tenantId: tenant.id,
          type: "IMAGE",
          provider: "SUPABASE",
          variant: "THUMB_256",
          bucket: BUCKET_NAME,
          key: thumbKey,
          publicUrl: thumbUpload.publicUrl,
          mimeType: getOutputMimeType(thumbnailResult.format),
          sizeBytes: thumbnailResult.buffer.length,
          width: thumbnailResult.width,
          height: thumbnailResult.height,
          groupId,
        },
      });

      // Crear o actualizar InventoryItemAsset apuntando al THUMB (según preferencia del usuario)
      // Si ya existe, se reemplaza (upsert)
      await tx.inventoryItemAsset.upsert({
        where: {
          tenantId_itemId_position: {
            tenantId: tenant.id,
            itemId,
            position,
          },
        },
        create: {
          tenantId: tenant.id,
          itemId,
          assetId: thumbAsset.id, // Apuntar al thumb para listas
          position,
        },
        update: {
          assetId: thumbAsset.id, // Reemplazar el asset anterior
        },
      });

      return {
        position,
        groupId,
        thumbUrl: thumbUpload.publicUrl,
        originalUrl: originalUpload.publicUrl,
        assetIds: [originalAsset.id, thumbAsset.id],
      };
    });

    // Revalidar paths de inventario (ajustar según la estructura de rutas)
    revalidatePath("/host/properties");
    // Revalidar la página de inventario del item si es posible obtener propertyId
    // Por ahora, revalidamos todas las propiedades (se puede optimizar después)

    return result;
  } catch (error) {
    console.error("[uploadInventoryItemImageAction] Error:", error);
    // Limpiar storage si falló la creación en DB
    try {
      await storageProvider.deleteObject({ bucket: BUCKET_NAME, key: originalKey });
      await storageProvider.deleteObject({ bucket: BUCKET_NAME, key: thumbKey });
    } catch (cleanupError) {
      console.error("[uploadInventoryItemImageAction] Cleanup error:", cleanupError);
    }
    throw error;
  }
}

/**
 * Elimina la imagen de un InventoryItem en una posición específica
 * 
 * @param formData - Debe contener: itemId, position (1-3)
 * @returns void
 * 
 * Nota: Por ahora solo desvincula el InventoryItemAsset, no borra los Assets (quedan huérfanos).
 * Esto permite recuperación si es necesario. Se puede implementar cleanup después.
 */
export async function deleteInventoryItemImageAction(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No tenant found");
  }

  const itemId = formData.get("itemId")?.toString();
  const positionStr = formData.get("position")?.toString();

  if (!itemId) {
    throw new Error("itemId es requerido");
  }

  if (!positionStr) {
    throw new Error("position es requerido");
  }

  const position = parseInt(positionStr, 10);
  if (isNaN(position) || position < 1 || position > 3) {
    throw new Error("position debe ser 1, 2 o 3");
  }

  // Verificar que el item existe y pertenece al tenant
  const item = await prisma.inventoryItem.findFirst({
    where: {
      id: itemId,
      tenantId: tenant.id,
    },
  });

  if (!item) {
    throw new Error("InventoryItem no encontrado o no pertenece a tu cuenta");
  }

  // Eliminar InventoryItemAsset (desvincular)
  // Los Assets quedan huérfanos por ahora (no se borran)
  await prisma.inventoryItemAsset.deleteMany({
    where: {
      tenantId: tenant.id,
      itemId,
      position,
    },
  });

  // Revalidar paths
  revalidatePath("/host/properties");
}

