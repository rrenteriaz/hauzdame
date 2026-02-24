// lib/utils/safeUuid.ts
/**
 * Genera un UUID v4 de forma segura, funcionando incluso en contextos no seguros (http://)
 * 
 * crypto.randomUUID() requiere un secure context (https:// o localhost)
 * Esta función proporciona un fallback para contextos http://192.168.x.x
 */

/**
 * Genera un UUID v4 seguro
 * - Intenta usar crypto.randomUUID() si está disponible (secure context)
 * - Si no, genera un UUID v4 válido usando Math.random() como fallback
 * - Nunca lanza excepciones
 */
export function safeUuid(): string {
  // 1) Intentar usar crypto.randomUUID() si está disponible (secure context)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      // Si falla (no secure context), usar fallback
      // Continuar al fallback sin lanzar error
    }
  }

  // 2) Fallback: generar UUID v4 con Math.random()
  // Formato: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // donde x es cualquier dígito hexadecimal
  // y es uno de 8, 9, a, o b (variante)
  
  const hex = "0123456789abcdef";
  
  // Generar 32 caracteres hexadecimales
  let uuid = "";
  for (let i = 0; i < 32; i++) {
    uuid += hex[Math.floor(Math.random() * 16)];
  }
  
  // Insertar guiones en las posiciones correctas
  // Formato: 8-4-4-4-12
  uuid = [
    uuid.substring(0, 8),
    uuid.substring(8, 12),
    uuid.substring(12, 16),
    uuid.substring(16, 20),
    uuid.substring(20, 32),
  ].join("-");
  
  // Asegurar versión "4" (posición 14)
  uuid = uuid.substring(0, 14) + "4" + uuid.substring(15);
  
  // Asegurar variante "8|9|a|b" (posición 19)
  const variant = ["8", "9", "a", "b"][Math.floor(Math.random() * 4)];
  uuid = uuid.substring(0, 19) + variant + uuid.substring(20);
  
  return uuid;
}

