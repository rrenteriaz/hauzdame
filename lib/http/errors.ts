// lib/http/errors.ts
/**
 * Helpers centralizados para errores HTTP
 * Uso: throw forbidden() o throw notFound() para lanzar errores con status codes
 */

/**
 * Lanza un error 403 (Forbidden)
 * El error incluye una propiedad status: 403 que puede ser capturada por handlers
 */
export function forbidden(message: string = "Acceso denegado"): never {
  const error = new Error(message);
  (error as any).status = 403;
  throw error;
}

/**
 * Lanza un error 404 (Not Found)
 * El error incluye una propiedad status: 404 que puede ser capturada por handlers
 */
export function notFound(message: string = "Recurso no encontrado"): never {
  const error = new Error(message);
  (error as any).status = 404;
  throw error;
}

