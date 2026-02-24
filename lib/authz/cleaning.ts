// lib/authz/cleaning.ts
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireTeamMembership } from "./teamMembership";

/**
 * Requiere acceso a una limpieza:
 * - Si cleaning.teamId existe: TeamMembership ACTIVE en ese team
 * - Si no tiene teamId: permitir acceso (limpiezas sin team)
 */
export async function requireCleaningAccess(cleaningId: string, options?: { roles?: ("OWNER" | "MANAGER" | "AUXILIAR" | "CLEANER" | "HANDYMAN")[] }) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("No autorizado");
  }

  // Cargar cleaning con teamId
  const cleaning = await prisma.cleaning.findUnique({
    where: { id: cleaningId },
    select: {
      id: true,
      teamId: true,
      tenantId: true,
    },
  });

  if (!cleaning) {
    throw new Error("Limpieza no encontrada");
  }

  // Si tiene teamId, validar TeamMembership
  if (cleaning.teamId) {
    await requireTeamMembership(cleaning.teamId, options);
  }

  // Si no tiene teamId, permitir acceso (limpiezas sin team asignado)
  return {
    user,
    cleaning,
  };
}

/**
 * Requiere permisos de CLEANER para acciones de cleaner
 */
export async function requireCleaningCleanerAccess(cleaningId: string) {
  const cleaning = await prisma.cleaning.findUnique({
    where: { id: cleaningId },
    select: {
      id: true,
      teamId: true,
    },
  });

  if (!cleaning) {
    throw new Error("Limpieza no encontrada");
  }

  if (cleaning.teamId) {
    return requireTeamMembership(cleaning.teamId, { roles: ["CLEANER"] });
  }

  // Si no tiene teamId, permitir acceso (limpiezas sin team)
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("No autorizado");
  }

  return { user, cleaning, membership: null };
}

