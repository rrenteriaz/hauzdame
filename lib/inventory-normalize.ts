// lib/inventory-normalize.ts
// Funciones de normalización para evitar duplicados semánticos

/**
 * Normaliza un nombre de item o área:
 * - Trim de espacios
 * - Convierte a minúsculas
 * - Unicode normalize NFD + remove diacritics (acentos)
 * - Colapsa múltiples espacios en uno solo
 * 
 * Ejemplo: "Colchón" -> "colchon", "colchon" -> "colchon"
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD") // Descompone caracteres con acentos (é -> e + ´)
    .replace(/[\u0300-\u036f]/g, "") // Elimina diacríticos (acentos)
    .replace(/\s+/g, " "); // Colapsa múltiples espacios en uno
}

/**
 * Capitaliza la primera letra de un string y convierte el resto a minúsculas.
 * Ejemplos:
 * - "colchón" -> "Colchón"
 * - "COLCHÓN" -> "Colchón"
 * - "sábanas" -> "Sábanas"
 * 
 * @param str - String a capitalizar
 * @returns String con la primera letra en mayúscula y el resto en minúsculas
 */
export function capitalizeFirst(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Calcula una firma estable (determinística) para variantes de inventario.
 * La firma se usa para detectar duplicados por área + variantes.
 * 
 * @param variants Objeto con variantes (ej: { bed_size: "Queen" })
 * @returns Firma estable como string (ej: "bed_size=queen")
 */
export function computeVariantSignature(variants: Record<string, string> | null | undefined): string {
  if (!variants || Object.keys(variants).length === 0) {
    return "";
  }

  // Ordenar keys para garantizar determinismo
  const sortedKeys = Object.keys(variants).sort();
  
  // Construir firma: key=value|key2=value2
  const parts = sortedKeys.map(key => {
    const value = variants[key];
    if (!value) return null;
    // Normalizar valor para comparación estable
    const normalizedValue = normalizeVariantValue(value);
    return `${key}=${normalizedValue}`;
  }).filter((part): part is string => part !== null);

  return parts.join("|");
}

/**
 * Normaliza un valor de variante (misma lógica que normalizeName).
 */
export function normalizeVariantValue(value: string): string {
  return normalizeName(value);
}

