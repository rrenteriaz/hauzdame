// lib/tenant.ts
import prisma from "@/lib/prisma";

/**
 * Por ahora: devuelve el primer tenant que exista.
 * Luego lo cambiaremos para usar el usuario logueado o subdominios.
 */
export async function getDefaultTenant() {
  const tenant = await prisma.tenant.findFirst();
  return tenant;
}
