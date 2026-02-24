// lib/cleaner-auth.ts
/**
 * LEGACY RETIRADO: Estas funciones ya no se usan en el flujo moderno.
 * MODERNO: Los cleaners ahora usan sesión + TeamMembership para autenticación.
 * 
 * Las funciones se mantienen por compatibilidad pero siempre retornan null/no-op.
 */

/**
 * LEGACY RETIRADO: Esta función ya no se usa en el flujo moderno.
 * MODERNO: Los cleaners ahora usan sesión + TeamMembership para autenticación.
 * 
 * Esta función siempre retorna null (no más soporte legacy basado en cookie).
 */
export async function getCurrentMember(tenantId: string, memberIdParam?: string) {
  // Legacy retirado: siempre retornar null
  // El flujo moderno usa TeamMembership, no TeamMember legacy
  return null;
}

/**
 * LEGACY RETIRADO: Esta función ya no se usa en el flujo moderno.
 * MODERNO: Los cleaners ahora usan sesión + TeamMembership para autenticación.
 * 
 * Esta función siempre retorna null (no más soporte legacy basado en cookie).
 */
export async function getCurrentMemberId(tenantId: string, memberIdParam?: string): Promise<string | null> {
  // Legacy retirado: siempre retornar null
  return null;
}

/**
 * LEGACY RETIRADO: Esta función ya no se usa en el flujo moderno.
 * MODERNO: Los cleaners ahora usan sesión + TeamMembership para autenticación.
 * 
 * Esta función es no-op (no setea cookies legacy).
 */
export async function setCurrentMember(memberId: string) {
  // Legacy retirado: no-op (no setear cookie legacy)
  // El flujo moderno usa TeamMembership, no cookies legacy
  return;
}
