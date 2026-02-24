/**
 * Utilidades puras para construir claves compuestas de checklist items.
 * Sin dependencias de servidor (Prisma). Seguro para importar en componentes cliente.
 */

/**
 * Normaliza un string para usar como clave compuesta:
 * - trim() para eliminar espacios al inicio/fin
 * - Reemplaza múltiples espacios por uno solo
 */
export function normalizeKey(s?: string): string {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

/**
 * Construye la clave compuesta normalizada para hacer match
 */
export function buildMatchKey(area: string, title: string, sortOrder: number): string {
  return `${normalizeKey(area)}|${normalizeKey(title)}|${sortOrder}`;
}
