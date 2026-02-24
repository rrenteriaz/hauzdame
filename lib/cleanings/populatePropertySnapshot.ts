// lib/cleanings/populatePropertySnapshot.ts
// Helper para poblar snapshot de información de propiedad en Cleaning

import prisma from "@/lib/prisma";

/**
 * Pobla el snapshot de información de propiedad en una Cleaning.
 * REQUISITO TÉCNICO: histórico de limpiezas debe poder renderizarse sin depender de Property actual.
 * 
 * @param cleaningId - ID de la Cleaning
 * @param propertyId - ID de la Property (opcional, si no se provee se lee de la Cleaning)
 * @param tenantId - Tenant ID para validación de scoping
 */
export async function populatePropertySnapshot(
  cleaningId: string,
  propertyId?: string,
  tenantId?: string
): Promise<void> {
  // Si no se provee propertyId, leerlo de la Cleaning
  let actualPropertyId = propertyId;
  let actualTenantId = tenantId;

  if (!actualPropertyId || !actualTenantId) {
    const cleaning = await prisma.cleaning.findUnique({
      where: { id: cleaningId },
      select: {
        propertyId: true,
        tenantId: true,
      },
    });

    if (!cleaning) {
      throw new Error(`Cleaning no encontrada: ${cleaningId}`);
    }

    actualPropertyId = cleaning.propertyId;
    actualTenantId = cleaning.tenantId;
  }

  // Leer información de la Property (solo en el tenant correcto para evitar leaks cross-tenant)
  const property = await prisma.property.findFirst({
    where: {
      id: actualPropertyId,
      tenantId: actualTenantId, // Scoping crítico
    },
    select: {
      name: true,
      shortName: true,
      address: true,
    },
  });

  if (!property) {
    // Si la propiedad no existe o no es accesible, dejar snapshot null
    // Esto puede ocurrir si la propiedad fue eliminada o desasignada
    console.warn(
      `[populatePropertySnapshot] Property no encontrada o no accesible: propertyId=${actualPropertyId}, tenantId=${actualTenantId}`
    );
    return;
  }

  // Actualizar Cleaning con snapshot
  await prisma.cleaning.update({
    where: { id: cleaningId },
    data: {
      propertyName: property.name,
      propertyShortName: property.shortName ?? null,
      propertyAddress: property.address ?? null,
    },
  });
}

/**
 * Pobla snapshot para múltiples Cleanings en batch (eficiente para backfill).
 * 
 * @param cleaningIds - Array de IDs de Cleanings
 */
export async function populatePropertySnapshotBatch(
  cleaningIds: string[]
): Promise<{ updated: number; errors: number }> {
  if (cleaningIds.length === 0) {
    return { updated: 0, errors: 0 };
  }

  // Leer todas las Cleanings con sus propertyIds y tenantIds
  const cleanings = await prisma.cleaning.findMany({
    where: {
      id: { in: cleaningIds },
    },
    select: {
      id: true,
      propertyId: true,
      tenantId: true,
    },
  });

  // Agrupar por tenantId para queries eficientes
  const cleaningsByTenant = new Map<string, Array<{ id: string; propertyId: string }>>();
  for (const cleaning of cleanings) {
    if (!cleaningsByTenant.has(cleaning.tenantId)) {
      cleaningsByTenant.set(cleaning.tenantId, []);
    }
    cleaningsByTenant.get(cleaning.tenantId)!.push({
      id: cleaning.id,
      propertyId: cleaning.propertyId,
    });
  }

  let updated = 0;
  let errors = 0;

  // Procesar por tenant (scoping crítico)
  for (const [tenantId, tenantCleanings] of cleaningsByTenant.entries()) {
    const propertyIds = Array.from(new Set(tenantCleanings.map((c) => c.propertyId)));

    // Leer todas las Properties del tenant en batch
    const properties = await prisma.property.findMany({
      where: {
        id: { in: propertyIds },
        tenantId, // Scoping crítico
      },
      select: {
        id: true,
        name: true,
        shortName: true,
        address: true,
      },
    });

    const propertyMap = new Map(properties.map((p) => [p.id, p]));

    // Actualizar cada Cleaning con su snapshot
    for (const cleaning of tenantCleanings) {
      const property = propertyMap.get(cleaning.propertyId);

      if (!property) {
        // Property no encontrada o no accesible (puede estar desasignada o eliminada)
        errors++;
        continue;
      }

      try {
        await prisma.cleaning.update({
          where: { id: cleaning.id },
          data: {
            propertyName: property.name,
            propertyShortName: property.shortName ?? null,
            propertyAddress: property.address ?? null,
          },
        });
        updated++;
      } catch (error) {
        console.error(`[populatePropertySnapshotBatch] Error actualizando Cleaning ${cleaning.id}:`, error);
        errors++;
      }
    }
  }

  return { updated, errors };
}

