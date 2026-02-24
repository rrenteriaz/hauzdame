// lib/users.ts
import prisma from "@/lib/prisma";

/**
 * Devuelve un usuario OWNER para el tenant.
 * Si no existe ninguno, crea uno "por defecto" para desarrollo.
 */
export async function getOrCreateDefaultOwner(tenantId: string) {
  // ¿Ya existe algún OWNER para este tenant?
  const existing = await prisma.user.findFirst({
    where: { tenantId, role: "OWNER" },
  });

  if (existing) return existing;

  // Si no, creamos uno mínimo.
  const created = await prisma.user.create({
    data: {
      tenantId,
      email: `owner+${tenantId}@hausdame.local`,
      name: "Owner Hausdame",
      role: "OWNER",
      // hashedPassword puede ser null por ahora
    },
  });

  return created;
}


