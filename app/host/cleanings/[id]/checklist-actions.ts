/**
 * Server Actions para gestionar el checklist de limpieza en la vista del host
 */

"use server";

import prisma from "@/lib/prisma";
import { requireHostUser } from "@/lib/auth/requireUser";
import { revalidatePath } from "next/cache";

export async function updateCleaningChecklistItem(
  cleaningId: string,
  itemId: string,
  title: string
) {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) return { success: false, error: "Usuario sin tenant asociado" };

  try {
    await (prisma as any).cleaningChecklistItem.updateMany({
      where: {
        id: itemId,
        cleaningId,
        tenantId: tenant.id,
      },
      data: {
        title: title.trim(),
      },
    });

    revalidatePath(`/host/cleanings/${cleaningId}`);
    return { success: true };
  } catch (error) {
    console.error("[updateCleaningChecklistItem] Error:", error);
    return { success: false, error: "Error al actualizar el item" };
  }
}

export async function deleteCleaningChecklistItem(
  cleaningId: string,
  itemId: string
) {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) return { success: false, error: "Usuario sin tenant asociado" };

  try {
    await (prisma as any).cleaningChecklistItem.deleteMany({
      where: {
        id: itemId,
        cleaningId,
        tenantId: tenant.id,
      },
    });

    revalidatePath(`/host/cleanings/${cleaningId}`);
    return { success: true };
  } catch (error) {
    console.error("[deleteCleaningChecklistItem] Error:", error);
    return { success: false, error: "Error al eliminar el item" };
  }
}

export async function addCleaningChecklistItem(
  cleaningId: string,
  area: string,
  title: string,
  sortOrder: number
) {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) return { success: false, error: "Usuario sin tenant asociado" };

  try {
    await (prisma as any).cleaningChecklistItem.create({
      data: {
        cleaningId,
        tenantId: tenant.id,
        area,
        title: title.trim(),
        sortOrder,
        isCompleted: false,
        requiresValue: false,
      },
    });

    revalidatePath(`/host/cleanings/${cleaningId}`);
    return { success: true };
  } catch (error) {
    console.error("[addCleaningChecklistItem] Error:", error);
    return { success: false, error: "Error al agregar el item" };
  }
}

export async function reorderCleaningChecklistItems(
  cleaningId: string,
  itemIds: string[]
) {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) return { success: false, error: "Usuario sin tenant asociado" };

  try {
    // Actualizar el sortOrder de cada item según su nueva posición
    await Promise.all(
      itemIds.map((itemId, index) =>
        (prisma as any).cleaningChecklistItem.updateMany({
          where: {
            id: itemId,
            cleaningId,
            tenantId: tenant.id,
          },
          data: {
            sortOrder: index,
          },
        })
      )
    );

    revalidatePath(`/host/cleanings/${cleaningId}`);
    return { success: true };
  } catch (error) {
    console.error("[reorderCleaningChecklistItems] Error:", error);
    return { success: false, error: "Error al reordenar los items" };
  }
}

export async function deleteCleaningChecklistArea(
  cleaningId: string,
  area: string
) {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) return { success: false, error: "Usuario sin tenant asociado" };

  try {
    await (prisma as any).cleaningChecklistItem.deleteMany({
      where: {
        cleaningId,
        tenantId: tenant.id,
        area,
      },
    });

    revalidatePath(`/host/cleanings/${cleaningId}`);
    return { success: true };
  } catch (error) {
    console.error("[deleteCleaningChecklistArea] Error:", error);
    return { success: false, error: "Error al eliminar el área" };
  }
}

export async function toggleCleaningChecklistItem(
  cleaningId: string,
  itemId: string,
  isCompleted: boolean
) {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) return { success: false, error: "Usuario sin tenant asociado" };

  try {
    await (prisma as any).cleaningChecklistItem.updateMany({
      where: {
        id: itemId,
        cleaningId,
        tenantId: tenant.id,
      },
      data: {
        isCompleted,
        // Si se marca como no completado, limpiar valores relacionados
        ...(isCompleted
          ? {}
          : {
              valueNumber: null,
              valueLabel: null,
              notCompletedReasonCode: null,
              notCompletedReasonNote: null,
            }),
      },
    });

    // CRÍTICO: NO usar revalidatePath aquí
    // - El optimistic UI ya actualiza la interfaz inmediatamente
    // - revalidatePath causa POST + re-render completo del Server Component
    // - Solo guardamos en DB, el estado se mantiene en el cliente
    // - Si el usuario navega/recarga, el server component se renderizará con datos frescos
    return { success: true };
  } catch (error) {
    console.error("[toggleCleaningChecklistItem] Error:", error);
    return { success: false, error: "Error al actualizar el item" };
  }
}

