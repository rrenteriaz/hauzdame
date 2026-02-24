// lib/auth/rateLimitUpload.ts
/**
 * Rate limiter simple en memoria para uploads de imágenes
 * Scope: userId
 * Límite: 10 imágenes / 5 minutos / user
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const WINDOW_MS = 5 * 60 * 1000; // 5 minutos
const MAX_UPLOADS = 10; // 10 imágenes por 5 minutos

/**
 * Limpiar entradas expiradas periódicamente
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60000); // Limpiar cada 5 minutos

/**
 * Verificar rate limit para uploads
 * @param userId ID del usuario
 * @returns true si está dentro del límite, false si excedió
 */
export function checkUploadRateLimit(
  userId: string
): { allowed: boolean; resetAt?: number } {
  const key = userId;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    // Primera solicitud o ventana expirada
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.count >= MAX_UPLOADS) {
    // Excedió el límite
    return {
      allowed: false,
      resetAt: entry.resetAt,
    };
  }

  // Incrementar contador
  entry.count++;
  return { allowed: true };
}

