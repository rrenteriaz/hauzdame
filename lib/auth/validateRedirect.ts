/**
 * Valida el parámetro redirect para prevenir open redirects.
 *
 * Acepta solo rutas internas (empiezan con /) y opcionalmente restringe
 * a prefijos permitidos. Si es inválido, retorna null para que el caller
 * use un default seguro.
 *
 * @param input - Valor del parámetro redirect (query/body)
 * @param allowedPrefixes - Opcional. Prefijos permitidos (ej. ["/host", "/cleaner"]). Si no se pasa, acepta cualquier ruta interna.
 * @returns La ruta validada o null si es inválida
 */
export function validateRedirect(
  input?: string | null,
  allowedPrefixes?: string[]
): string | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Decodificar primero (p. ej. %2F -> /) para validar correctamente
  let decoded = trimmed;
  try {
    if (trimmed.includes("%")) {
      decoded = decodeURIComponent(trimmed);
    }
  } catch {
    decoded = trimmed;
  }

  // Rechazar URLs absolutas y protocol-relative
  const lower = decoded.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) return null;
  if (decoded.startsWith("//")) return null;

  // Debe empezar exactamente con "/" (una sola barra)
  if (!decoded.startsWith("/")) return null;

  // Extraer path base (sin query para validar prefijo)
  const pathOnly = decoded.split("?")[0];

  if (allowedPrefixes && allowedPrefixes.length > 0) {
    const isValid = allowedPrefixes.some((prefix) => pathOnly.startsWith(prefix));
    return isValid ? decoded : null;
  }

  return decoded;
}

/** Prefijos permitidos por defecto para redirect en login/signup */
export const AUTH_REDIRECT_PREFIXES = [
  "/host",
  "/cleaner",
  "/join",
  "/login",
  "/signup",
  "/app",
  "/handy",
] as const;
