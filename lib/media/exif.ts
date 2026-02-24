// lib/media/exif.ts
// Utilidad para extraer metadata EXIF de imágenes en el cliente

/**
 * Extrae la fecha/hora original (takenAt) desde metadata EXIF de una imagen
 * @param file - Archivo de imagen
 * @returns ISO string de la fecha/hora original, o null si no se puede extraer
 */
export async function extractTakenAtFromFile(file: File): Promise<string | null> {
  try {
    // Leer el archivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Importar exifr (debe estar instalado: npm install exifr)
    const exifr = await import('exifr');
    
    // Extraer EXIF data
    const exifData = await exifr.parse(arrayBuffer, {
      pick: ['DateTimeOriginal', 'CreateDate', 'DateTimeDigitized'],
      translateKeys: false,
      translateValues: false,
      reviveValues: false,
    });
    
    if (!exifData) {
      return null;
    }
    
    // Prioridad: DateTimeOriginal > CreateDate > DateTimeDigitized
    const dateTimeStr = 
      exifData.DateTimeOriginal || 
      exifData.CreateDate || 
      exifData.DateTimeDigitized;
    
    if (!dateTimeStr) {
      return null;
    }
    
    // Convertir a Date
    // EXIF dates vienen en formato: "YYYY:MM:DD HH:mm:ss"
    // o como Date object si exifr lo parsea
    let date: Date;
    
    if (dateTimeStr instanceof Date) {
      date = dateTimeStr;
    } else if (typeof dateTimeStr === 'string') {
      // Formato EXIF: "YYYY:MM:DD HH:mm:ss"
      const parts = dateTimeStr.split(/[: ]/);
      if (parts.length >= 6) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const day = parseInt(parts[2], 10);
        const hour = parseInt(parts[3], 10);
        const minute = parseInt(parts[4], 10);
        const second = parseInt(parts[5], 10);
        
        // Asumir zona horaria America/Mexico_City si no hay offset en EXIF
        // Crear fecha en UTC y luego ajustar a Mexico City (UTC-6 o UTC-5 según DST)
        date = new Date(Date.UTC(year, month, day, hour, minute, second));
        
        // Ajustar a America/Mexico_City (UTC-6, sin DST por simplicidad)
        // En producción, usar una librería de timezone como date-fns-tz
        const mexicoOffset = -6 * 60; // UTC-6 en minutos
        date = new Date(date.getTime() + mexicoOffset * 60 * 1000);
      } else {
        // Intentar parsear como ISO string
        date = new Date(dateTimeStr);
      }
    } else {
      return null;
    }
    
    // Validar que la fecha sea válida
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Validar que la fecha no sea futura (máximo 1 hora en el futuro por tolerancia)
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    if (date > oneHourFromNow) {
      // Si la fecha es futura, probablemente es un error de EXIF, usar null
      return null;
    }
    
    // Retornar como ISO string
    return date.toISOString();
  } catch (error) {
    console.warn('Error extrayendo EXIF takenAt:', error);
    return null;
  }
}

/**
 * Extrae dimensiones de una imagen desde el archivo
 * @param file - Archivo de imagen
 * @returns Objeto con width y height, o null si no se puede extraer
 */
export async function extractImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    
    img.src = url;
  });
}

