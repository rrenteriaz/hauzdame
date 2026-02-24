// lib/auth/rateLimitMessage.ts
/**
 * Rate limiter simple en memoria para envío de mensajes
 * Scope: userId + threadId
 * Límite: 20 mensajes / minuto / thread
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 20; // 20 mensajes por minuto

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
}, 60000); // Limpiar cada minuto

/**
 * Verificar rate limit para envío de mensajes
 * @param userId ID del usuario
 * @param threadId ID del thread
 * @returns true si está dentro del límite, false si excedió
 */
export function checkMessageRateLimit(
  userId: string,
  threadId: string
): { allowed: boolean; resetAt?: number } {
  const key = `${userId}:${threadId}`;
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

  if (entry.count >= MAX_REQUESTS) {
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

