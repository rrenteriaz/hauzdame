// lib/cleaner/resolveCleanerContext.ts
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
// REGLA DE ORO: NO importar funciones que crean entidades (bootstrap)

/**
 * Helper para crear slug desde un nombre
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[^a-z0-9]+/g, "-") // espacios y símbolos -> guiones
    .replace(/^-+|-+$/g, ""); // quitar guiones al inicio/fin
}

/**
 * LEGACY RETIRADO: Ya no existe modo "legacy" en la implementación
 * MODERNO: Todos los cleaners usan TeamMembership (mode siempre es "membership")
 * Tipo mantenido por compatibilidad con código existente que aún verifica mode === "legacy"
 */
export type CleanerContextMode = "membership" | "legacy";

export interface CleanerContext {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  /**
   * Tenant hogar del cleaner (User.tenantId).
   * Puede ser null si el cleaner aún no tiene tenant asignado.
   */
  homeTenantId: string | null;
  memberships: Array<{
    id: string;
    teamId: string;
    role: string;
    status: string;
  }>;
  /**
   * Flag explícito: true si tiene al menos una TeamMembership ACTIVE
   */
  hasMembership: boolean;
  /**
   * LEGACY RETIRADO: Siempre null (ya no se usa TeamMember legacy)
   * Tipo mantenido por compatibilidad con código existente que aún verifica legacyMember
   */
  legacyMember: {
    id: string;
    teamId: string;
    isActive: boolean;
  } | null;
  /**
   * LEGACY RETIRADO: Siempre "membership" (ya no existe modo legacy)
   * Tipo mantenido por compatibilidad con código existente que aún verifica mode === "legacy"
   */
  mode: CleanerContextMode;
  teamIds: string[]; // Lista de teamIds donde el cleaner tiene acceso
}

/**
 * Resuelve el contexto del cleaner basado en TeamMembership ACTIVE
 * LEGACY RETIRADO: Ya no se usa TeamMember legacy ni cookie hd_cleaner_member_id
 * 
 * REGLA DE ORO: Esta función NO crea Team ni TeamMembership.
 * Si el cleaner no tiene TeamMembership, retorna contexto válido con hasMembership: false.
 * El guard del layout redirige a /cleaner/onboarding cuando hasMembership === false.
 */
export async function resolveCleanerContext(
  userOverride?: Awaited<ReturnType<typeof getCurrentUser>>
): Promise<CleanerContext> {
  // Contador global DEV para detectar loops (solo en desarrollo)
  const g: any = globalThis as any;
  g.__rcc_count = (g.__rcc_count ?? 0) + 1;
  const id = g.__rcc_count;
  
  // Solo loggear cada 5 llamadas para reducir ruido
  if (id % 5 === 0) {
    console.log("[resolveCleanerContext] call#", id);
  }
  
  // Log stack trace solo cuando se habilite explícitamente
  if (process.env.DEBUG_RCC === "1" && id === 20) {
    console.trace("[resolveCleanerContext] trace at 20 - posible loop");
  }
  
  let user = userOverride;
  if (!user) {
    console.time(`[rcc#${id}] getCurrentUser`);
    user = await getCurrentUser();
    console.timeEnd(`[rcc#${id}] getCurrentUser`);
  }
  if (!user) {
    throw new Error("No autorizado");
  }

  if (user.role !== "CLEANER") {
    throw new Error("Esta función solo es para cleaners");
  }

  // REGLA DE ORO: NO crear tenant, team ni TeamMembership automáticamente
  // Si user.tenantId es null, simplemente retornar null en homeTenantId
  const homeTenantId = user.tenantId;

  // 1) Buscar memberships ACTIVE para user.id (cualquier rol, no solo CLEANER)
  // Esto permite que usuarios con memberships en otros roles también puedan acceder
  console.time(`[rcc#${id}] teamMembership.findMany`);
  const memberships = await prisma.teamMembership.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    select: {
      id: true,
      teamId: true,
      role: true,
      status: true,
    },
    orderBy: {
      createdAt: "desc", // Más reciente primero
    },
  });
  console.timeEnd(`[rcc#${id}] teamMembership.findMany`);

  // 2) Si hay >=1 membership, retornar contexto con hasMembership: true
  if (memberships.length > 0) {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      homeTenantId,
      memberships,
      hasMembership: true,
      legacyMember: null,
      mode: "membership",
      teamIds: memberships.map((m) => m.teamId),
    };
  }

  // 3) Si no hay memberships, retornar contexto válido SIN crear nada
  // REGLA DE ORO: NO crear Team ni TeamMembership automáticamente
  // El guard del layout redirige a /cleaner/onboarding cuando hasMembership === false
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    homeTenantId,
    memberships: [],
    hasMembership: false,
    legacyMember: null,
    mode: "membership",
    teamIds: [],
  };
}

