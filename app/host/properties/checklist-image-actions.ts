// app/host/properties/checklist-image-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { requireHostUser } from "@/lib/auth/requireUser";
import { revalidatePath } from "next/cache";
import storageProvider from "@/lib/storage";
import { generateThumbnail, getOutputMimeType } from "@/lib/media/thumbnail";
import { randomUUID } from "crypto";
import sharp from "sharp";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const BUCKET_NAME = "checklist-item-images";

/**
 * Upload de imagen para un PropertyChecklistItem
 * 
 * @param formData - Debe contener: checklistItemId, position (1-3), file
 * @returns { position, groupId, thumbUrl, originalUrl, assetIds: [originalId, thumbId] }
 */
export async function uploadChecklistItemImageAction(formData: FormData) {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) throw new Error("Usuario sin tenant asociado");

  const checklistItemId = formData.get("checklistItemId")?.toString();
  const positionStr = formData.get("position")?.toString();
  const file = formData.get("file") as File | null;

  // Validaciones básicas
  if (!checklistItemId) {
    throw new Error("checklistItemId es requerido");
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
  const checklistItem = await prisma.propertyChecklistItem.findFirst({
    where: {
      id: checklistItemId,
      tenantId,
    },
    select: {
      id: true,
      propertyId: true,
    },
  });

  if (!checklistItem) {
    throw new Error("PropertyChecklistItem no encontrado o no pertenece a tu cuenta");
  }

  // Verificar que la propiedad también pertenece al tenant (doble validación)
  const property = await prisma.property.findFirst({
    where: {
      id: checklistItem.propertyId,
      tenantId,
    },
    select: {
      id: true,
    },
  });

  if (!property) {
    throw new Error("Propiedad no encontrada o no pertenece a tu cuenta");
  }

  // Si ya existe una imagen en esta posición, obtener el assetId actual para referencia
  const existingItemAsset = await (prisma as any).checklistItemAsset.findFirst({
    where: {
      tenantId,
      checklistItemId,
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
  const originalKey = `${tenantId}/checklist-items/${checklistItemId}/${groupId}/original.${fileExtension}`;
  const thumbKey = `${tenantId}/checklist-items/${checklistItemId}/${groupId}/thumb_256.${thumbnailResult.format}`;

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

    // Crear registros Asset en la base de datos y actualizar/crear ChecklistItemAsset
    const result = await prisma.$transaction(async (tx) => {
      // Crear Asset original
      const originalAsset = await tx.asset.create({
        data: {
          tenantId,
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
          tenantId,
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

      // Crear o actualizar ChecklistItemAsset apuntando al THUMB (según preferencia del usuario)
      // Si ya existe, se reemplaza (upsert)
      await (tx as any).checklistItemAsset.upsert({
        where: {
          tenantId_checklistItemId_position: {
            tenantId,
            checklistItemId,
            position,
          },
        },
        create: {
          tenantId,
          checklistItemId,
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

    // Revalidar paths de checklist
    revalidatePath("/host/properties");
    revalidatePath(`/host/properties/${property.id}/checklist`);

    return result;
  } catch (error) {
    console.error("[uploadChecklistItemImageAction] Error:", error);
    // Limpiar storage si falló la creación en DB
    try {
      await storageProvider.deleteObject({ bucket: BUCKET_NAME, key: originalKey });
      await storageProvider.deleteObject({ bucket: BUCKET_NAME, key: thumbKey });
    } catch (cleanupError) {
      console.error("[uploadChecklistItemImageAction] Cleanup error:", cleanupError);
    }
    throw error;
  }
}

/**
 * Elimina la imagen de un PropertyChecklistItem en una posición específica
 * 
 * @param formData - Debe contener: checklistItemId, position (1-3)
 * @returns void
 * 
 * Nota: Por ahora solo desvincula el ChecklistItemAsset, no borra los Assets (quedan huérfanos).
 * Esto permite recuperación si es necesario. Se puede implementar cleanup después.
 */
export async function deleteChecklistItemImageAction(formData: FormData) {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) throw new Error("Usuario sin tenant asociado");

  const checklistItemId = formData.get("checklistItemId")?.toString();
  const positionStr = formData.get("position")?.toString();

  if (!checklistItemId) {
    throw new Error("checklistItemId es requerido");
  }

  if (!positionStr) {
    throw new Error("position es requerido");
  }

  const position = parseInt(positionStr, 10);
  if (isNaN(position) || position < 1 || position > 3) {
    throw new Error("position debe ser 1, 2 o 3");
  }

  // Verificar que el item existe y pertenece al tenant
  const checklistItem = await prisma.propertyChecklistItem.findFirst({
    where: {
      id: checklistItemId,
      tenantId,
    },
    select: {
      id: true,
      propertyId: true,
    },
  });

  if (!checklistItem) {
    throw new Error("PropertyChecklistItem no encontrado o no pertenece a tu cuenta");
  }

  // Eliminar ChecklistItemAsset (desvincular)
  // Los Assets quedan huérfanos por ahora (no se borran)
  await (prisma as any).checklistItemAsset.deleteMany({
    where: {
      tenantId,
      checklistItemId,
      position,
    },
  });

  // Revalidar paths
  revalidatePath("/host/properties");
  revalidatePath(`/host/properties/${checklistItem.propertyId}/checklist`);
}

