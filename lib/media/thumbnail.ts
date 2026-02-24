// lib/media/thumbnail.ts
/**
 * Generación de thumbnails (256px)
 * 
 * Usa sharp para redimensionar imágenes manteniendo aspect ratio.
 * Output: WebP si es posible, sino mantiene formato original.
 */

import sharp from "sharp";

const THUMBNAIL_SIZE = 256; // px en el lado más largo

export interface ThumbnailResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

/**
 * Genera un thumbnail de 256px (lado más largo)
 */
export async function generateThumbnail(
  inputBuffer: Buffer,
  mimeType: string
): Promise<ThumbnailResult> {
  let sharpInstance = sharp(inputBuffer);

  // Obtener metadata
  const metadata = await sharpInstance.metadata();
  const originalWidth = metadata.width || 1;
  const originalHeight = metadata.height || 1;

  // Calcular dimensiones manteniendo aspect ratio
  let width: number;
  let height: number;
  
  if (originalWidth > originalHeight) {
    width = THUMBNAIL_SIZE;
    height = Math.round((THUMBNAIL_SIZE / originalWidth) * originalHeight);
  } else {
    height = THUMBNAIL_SIZE;
    width = Math.round((THUMBNAIL_SIZE / originalHeight) * originalWidth);
  }

  // Convertir a WebP si es posible, sino mantener formato original
  const outputFormat = mimeType.includes("png") ? "png" : 
                       mimeType.includes("webp") ? "webp" : 
                       "jpeg";

  sharpInstance = sharpInstance.resize(width, height, {
    fit: "inside",
    withoutEnlargement: true,
  });

  if (outputFormat === "webp") {
    sharpInstance = sharpInstance.webp({ quality: 85 });
  } else if (outputFormat === "png") {
    sharpInstance = sharpInstance.png({ compressionLevel: 9 });
  } else {
    sharpInstance = sharpInstance.jpeg({ quality: 85 });
  }

  const buffer = await sharpInstance.toBuffer();

  return {
    buffer,
    width,
    height,
    format: outputFormat,
  };
}

/**
 * Obtiene el mimeType del output basado en el formato
 */
export function getOutputMimeType(format: string): string {
  switch (format) {
    case "webp":
      return "image/webp";
    case "png":
      return "image/png";
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

