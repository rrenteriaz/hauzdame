// lib/auth/guards.ts
import prisma from "@/lib/prisma";
import type { AuthenticatedUser } from "./requireUser";

/**
 * Verifica si el usuario puede acceder a una propiedad
 * (es owner, admin, cleaner o handyman de la propiedad)
 */
export async function canAccessProperty(
  user: AuthenticatedUser,
  propertyId: string
): Promise<boolean> {
  // Verificar que la propiedad pertenece al mismo tenant
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      tenantId: user.tenantId,
    },
    select: {
      userId: true,
      admins: {
        select: { userId: true },
      },
      cleaners: {
        select: { userId: true },
      },
      handymen: {
        select: { userId: true },
      },
    },
  });

  if (!property) {
    return false;
  }

  // Es owner de la propiedad
  if (property.userId === user.id) {
    return true;
  }

  // Es admin de la propiedad
  if (property.admins.some((admin) => admin.userId === user.id)) {
    return true;
  }

  // Es cleaner de la propiedad
  if (property.cleaners.some((cleaner) => cleaner.userId === user.id)) {
    return true;
  }

  // Es handyman de la propiedad
  if (property.handymen.some((handyman) => handyman.userId === user.id)) {
    return true;
  }

  // Si es OWNER o ADMIN del tenant, puede acceder a todas las propiedades
  if (user.role === "OWNER" || user.role === "ADMIN") {
    return true;
  }

  return false;
}

/**
 * Verifica si el usuario puede acceder a un thread de chat
 * REGLA PRINCIPAL: Solo participantes activos (leftAt = null) pueden acceder.
 * NO se usa fallback por propiedad para lectura (seguridad).
 * 
 * Cross-tenant: El acceso depende SOLO de ChatParticipant.userId,
 * NO del tenantId del thread o del user.
 * 
 * @deprecated Usar requireChatParticipant de @/lib/chat/auth en su lugar
 * Este helper se mantiene por compatibilidad pero delegará a requireChatParticipant
 */
export async function canAccessThread(
  user: AuthenticatedUser,
  threadId: string
): Promise<boolean> {
  // Verificar que el usuario es participante activo del thread
  const participant = await prisma.chatParticipant.findFirst({
    where: {
      threadId,
      userId: user.id,
      leftAt: null, // No ha salido del thread
    },
  });

  // Solo participantes activos pueden acceder
  // NO hay fallback por propiedad para evitar riesgos de seguridad
  return !!participant;
}

/**
 * Verifica si el usuario puede crear/pausar/cerrar openings
 * (debe ser Owner/Admin/Auxiliar con acceso a la propiedad)
 */
export async function canManageOpening(
  user: AuthenticatedUser,
  propertyId: string
): Promise<boolean> {
  // Solo OWNER o ADMIN pueden gestionar openings
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    return false;
  }

  return canAccessProperty(user, propertyId);
}

/**
 * Verifica si el usuario puede aplicar a openings
 * (debe ser CLEANER)
 */
export function canApplyToOpening(user: AuthenticatedUser): boolean {
  return user.role === "CLEANER";
}

/**
 * Verifica si el usuario puede aceptar/rechazar aplicaciones
 * (debe ser Owner/Admin/Auxiliar con acceso a la propiedad)
 */
export async function canManageApplication(
  user: AuthenticatedUser,
  propertyId: string
): Promise<boolean> {
  return canManageOpening(user, propertyId);
}

