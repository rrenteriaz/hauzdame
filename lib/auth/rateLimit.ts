// lib/auth/rateLimit.ts
/**
 * Rate limiting simple en memoria
 * En producción, considerar usar Redis o un servicio dedicado
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Verifica si una acción está dentro del límite de rate
 * @param key - Clave única para el rate limit (ej: IP + identifier)
 * @param maxAttempts - Número máximo de intentos
 * @param windowMs - Ventana de tiempo en milisegundos
 * @returns true si está dentro del límite, false si excedió
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 10,
  windowMs: number = 15 * 60 * 1000 // 15 minutos por defecto
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // No hay entrada o expiró, crear nueva
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  // Incrementar contador
  entry.count += 1;

  if (entry.count > maxAttempts) {
    return false; // Excedió el límite
  }

  return true; // Dentro del límite
}

/**
 * Obtiene el tiempo restante hasta que se resetee el rate limit
 */
export function getRateLimitResetTime(key: string): number | null {
  const entry = rateLimitStore.get(key);
  if (!entry) {
    return null;
  }
  return Math.max(0, entry.resetAt - Date.now());
}

