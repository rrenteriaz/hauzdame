/**
 * Helpers de normalización para keys y values de variantes.
 * Slug-safe, consistentes.
 */

/**
 * Normaliza input para usar como key (ej. group.key).
 * snake_case: trim, lowercase, espacios/hyphens -> underscore, remover acentos.
 */
export function normalizeKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Normaliza input para usar como valueNormalized (ej. option.valueNormalized).
 * snake_case: igual que key.
 */
export function normalizeValue(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}
