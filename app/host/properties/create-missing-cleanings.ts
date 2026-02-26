/**
 * Server Action para crear limpiezas faltantes para reservas CONFIRMED existentes
 */

"use server";

import prisma from "@/lib/prisma";
import { requireHostUser } from "@/lib/auth/requireUser";
import { revalidatePath } from "next/cache";
import { getEligibleMembersForCleaning } from "@/lib/cleaning-eligibility";
import { createChecklistSnapshotForCleaning } from "@/lib/checklist-snapshot";
// FASE 4: propertyId ahora es el nuevo PK directamente, no necesitamos helper

function calculateCleaningDate(endDate: Date, checkOutTime: string | null | undefined): Date {
  const cleaningDate = new Date(endDate);
  
  let hours = 11; // Default 11:00
  let minutes = 0;
  
  if (checkOutTime) {
    const [h, m] = checkOutTime.split(":").map(Number);
    if (!isNaN(h)) hours = h;
    if (!isNaN(m)) minutes = m;
  }
  
  cleaningDate.setHours(hours, minutes, 0, 0);
  return cleaningDate;
}

export async function createMissingCleaningsForReservations(): Promise<{
  created: number;
  errors: string[];
}> {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) throw new Error("Usuario sin tenant asociado");

  const result = {
    created: 0,
    errors: [] as string[],
  };

  try {
    console.log("[createMissingCleaningsForReservations] Buscando reservas CONFIRMED sin limpieza...");

    // Obtener todas las reservas CONFIRMED de iCal
    const confirmedReservations = await (prisma as any).reservation.findMany({
      where: {
        tenantId,
        status: "CONFIRMED",
        source: "ICAL",
      },
      include: {
        property: {
          select: {
            id: true,
            checkOutTime: true,
          },
        },
        cleanings: true,
      },
    });

    console.log(`[createMissingCleaningsForReservations] Encontradas ${confirmedReservations.length} reservas CONFIRMED`);

    for (const reservation of confirmedReservations) {
      // Verificar si ya tiene limpieza
      if (reservation.cleanings && reservation.cleanings.length > 0) {
        console.log(`[createMissingCleaningsForReservations] Reserva ${reservation.id} ya tiene ${reservation.cleanings.length} limpieza(s)`);
        continue;
      }

      try {
        console.log(`[createMissingCleaningsForReservations] Creando limpieza para reserva ${reservation.id}`);

        const scheduledAtOriginal = calculateCleaningDate(
          reservation.endDate,
          reservation.property?.checkOutTime
        );

        // FASE 4: propertyId ahora es el nuevo PK directamente
        // Verificar que la propiedad existe y obtener información para snapshot
        const property = await prisma.property.findFirst({
          where: { id: reservation.propertyId, tenantId },
          select: {
            id: true,
            name: true,
            shortName: true,
            address: true,
          },
        });
        
        if (!property) {
          throw new Error(`Property not found for propertyId: ${reservation.propertyId}`);
        }

        // FASE 4: Obtener miembros elegibles (usar propertyId)
        const eligibleMembers = await getEligibleMembersForCleaning(
          tenantId,
          property.id, // FASE 4: propertyId ahora es el nuevo PK
          scheduledAtOriginal
        );

        let assignedMemberId: string | null = null;
        let assignmentStatus: "OPEN" | "ASSIGNED" = "OPEN";
        let needsAttention = false;
        let attentionReason: string | null = null;

        if (eligibleMembers.length === 1) {
          assignedMemberId = eligibleMembers[0].id;
          assignmentStatus = "ASSIGNED";
        } else if (eligibleMembers.length === 0) {
          needsAttention = true;
          attentionReason = "NO_AVAILABLE_MEMBER";
        }

        const cleaning = await (prisma as any).cleaning.create({
          data: {
            tenantId,
            propertyId: property.id, // FASE 4: propertyId ahora apunta directamente a Property.id
            reservationId: reservation.id,
            scheduledAtOriginal,
            scheduledAtPlanned: scheduledAtOriginal,
            scheduledDate: scheduledAtOriginal,
            status: "PENDING",
            assignmentStatus,
            assignedMemberId,
            needsAttention,
            attentionReason,
            // Snapshot de propiedad (requisito técnico para histórico sin depender de Property actual)
            propertyName: property.name,
            propertyShortName: property.shortName ?? null,
            propertyAddress: property.address ?? null,
          },
        });

        // FASE 4: Crear snapshot del checklist (usar propertyId)
        await createChecklistSnapshotForCleaning(
          tenantId,
          property.id, // FASE 4: propertyId ahora es el nuevo PK
          cleaning.id
        );

        console.log(`[createMissingCleaningsForReservations] ✅ Limpieza creada para reserva ${reservation.id}`);
        result.created++;
      } catch (error: any) {
        const errorMsg = `Error creando limpieza para reserva ${reservation.id}: ${error.message}`;
        console.error(`[createMissingCleaningsForReservations] ${errorMsg}`, error);
        result.errors.push(errorMsg);
      }
    }

    // Revalidar paths
    revalidatePath("/host/properties");
    revalidatePath("/host/cleanings");

    console.log(`[createMissingCleaningsForReservations] Completado: ${result.created} limpiezas creadas, ${result.errors.length} errores`);
    return result;
  } catch (error: any) {
    console.error("[createMissingCleaningsForReservations] Error:", error);
    result.errors.push(error.message || "Unknown error");
    return result;
  }
}

