/**
 * Helper para crear snapshot del checklist cuando se crea una limpieza
 */

import prisma from "@/lib/prisma";

/**
 * Crea un snapshot del checklist de la propiedad para una limpieza
 * Solo copia los items ACTIVOS del checklist de la propiedad
 */
export async function createChecklistSnapshotForCleaning(
  tenantId: string,
  propertyId: string,
  cleaningId: string
): Promise<void> {
  // FASE 5: Obtener items activos del checklist de la propiedad (usar propertyId)
  const propertyItems = await (prisma as any).propertyChecklistItem.findMany({
    where: {
      propertyId: propertyId, // FASE 5: propertyId ahora es el PK directamente
      tenantId,
      isActive: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
  });

  // Si no hay items activos, no crear snapshot
  if (propertyItems.length === 0) {
    return;
  }

  // Verificar si ya existe un snapshot (idempotencia)
  const existingSnapshot = await (prisma as any).cleaningChecklistItem.findFirst({
    where: {
      cleaningId,
      tenantId,
    },
  });

  if (existingSnapshot) {
    // Ya existe snapshot, no duplicar
    return;
  }

  // Crear snapshot copiando los items activos (incluyendo requiresValue/valueLabel)
  await (prisma as any).cleaningChecklistItem.createMany({
    data: propertyItems.map((item: any) => ({
      tenantId,
      cleaningId,
      area: item.area,
      title: item.title,
      sortOrder: item.sortOrder,
      isCompleted: false,
      requiresValue: item.requiresValue || false,
      valueLabel: item.valueLabel || null,
    })),
  });
}

