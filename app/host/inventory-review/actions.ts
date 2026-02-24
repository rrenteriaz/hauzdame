// app/host/inventory-review/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import {
  InventoryReviewStatus,
  InventoryChangeReason,
  InventoryChangeStatus,
  InventoryReportType,
  InventoryReportSeverity,
  InventoryReportStatus,
} from "@prisma/client";

/**
 * Crea o actualiza una revisión de inventario (DRAFT).
 * Si ya existe, la actualiza. Si no, la crea.
 */
export async function createOrUpdateInventoryReview(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const cleaningId = formData.get("cleaningId")?.toString();
  if (!cleaningId) {
    throw new Error("No se encontró la limpieza");
  }

  // Verificar que la limpieza existe y obtener propertyId
  const cleaning = await prisma.cleaning.findUnique({
    where: { id: cleaningId },
    select: { id: true, propertyId: true, tenantId: true },
  });

  if (!cleaning) {
    throw new Error("Limpieza no encontrada");
  }

  if (cleaning.tenantId !== tenant.id) {
    throw new Error("No tienes permiso para esta limpieza");
  }

  // Buscar revisión existente
  const existingReview = await prisma.inventoryReview.findUnique({
    where: { cleaningId },
  });

  const reviewData = {
    tenantId: tenant.id,
    cleaningId,
    propertyId: cleaning.propertyId,
    status: InventoryReviewStatus.DRAFT,
    notes: formData.get("notes")?.toString().trim() || null,
  };

  if (existingReview) {
    // Actualizar revisión existente (solo si está en DRAFT)
    if (existingReview.status !== InventoryReviewStatus.DRAFT) {
      throw new Error("No se puede modificar una revisión ya enviada");
    }

    const updated = await prisma.inventoryReview.update({
      where: { id: existingReview.id },
      data: reviewData,
    });

    revalidatePath(`/host/cleanings/${cleaningId}`);
    return { id: updated.id, status: updated.status };
  } else {
    // Crear nueva revisión
    const created = await prisma.inventoryReview.create({
      data: reviewData,
    });

    revalidatePath(`/host/cleanings/${cleaningId}`);
    return { id: created.id, status: created.status };
  }
}

/**
 * Envía una revisión de inventario (cambia status a SUBMITTED).
 * Valida que todos los cambios de cantidad tengan razón.
 */
export async function submitInventoryReview(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const reviewId = formData.get("reviewId")?.toString();
  if (!reviewId) {
    throw new Error("No se encontró la revisión");
  }

  const review = await prisma.inventoryReview.findUnique({
    where: { id: reviewId },
    include: {
      itemChanges: true,
    },
  });

  // Filtrar cambios donde la cantidad cambió (en JavaScript)
  if (review) {
    review.itemChanges = review.itemChanges.filter(
      (change) => change.quantityBefore !== change.quantityAfter
    );
  }

  if (!review) {
    throw new Error("Revisión no encontrada");
  }

  if (review.tenantId !== tenant.id) {
    throw new Error("No tienes permiso para esta revisión");
  }

  if (review.status !== InventoryReviewStatus.DRAFT) {
    throw new Error("Solo se pueden enviar revisiones en estado DRAFT");
  }

  // Validar que todos los cambios de cantidad tengan razón
  const changesWithoutReason = review.itemChanges.filter(
    (change) => !change.reason || (change.reason === InventoryChangeReason.OTHER && !change.reasonOtherText)
  );

  if (changesWithoutReason.length > 0) {
    throw new Error("Todos los cambios de cantidad deben tener una razón especificada");
  }

  // Actualizar status a SUBMITTED
  const updated = await prisma.inventoryReview.update({
    where: { id: reviewId },
    data: {
      status: InventoryReviewStatus.SUBMITTED,
      submittedAt: new Date(),
    },
  });

  // Revalidar tanto la página de detalle como la de inventory-review
  revalidatePath(`/host/cleanings/${review.cleaningId}`);
  revalidatePath(`/host/cleanings/${review.cleaningId}/inventory-review`);
  return { id: updated.id, status: updated.status };
}

/**
 * Crea o actualiza un cambio de cantidad en una revisión.
 */
export async function createOrUpdateInventoryChange(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const reviewId = formData.get("reviewId")?.toString();
  const itemId = formData.get("itemId")?.toString();
  const quantityAfterStr = formData.get("quantityAfter")?.toString();
  const reasonStr = formData.get("reason")?.toString();
  const reasonOtherText = formData.get("reasonOtherText")?.toString().trim() || null;
  const note = formData.get("note")?.toString().trim() || null;

  if (!reviewId || !itemId || !quantityAfterStr) {
    throw new Error("Faltan datos requeridos");
  }

  const quantityAfter = parseInt(quantityAfterStr, 10);
  if (isNaN(quantityAfter) || quantityAfter < 0) {
    throw new Error("La cantidad debe ser un número válido mayor o igual a 0");
  }

  // Verificar que la revisión existe y está en DRAFT
  const review = await prisma.inventoryReview.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true, tenantId: true, cleaningId: true },
  });

  if (!review) {
    throw new Error("Revisión no encontrada");
  }

  if (review.tenantId !== tenant.id) {
    throw new Error("No tienes permiso para esta revisión");
  }

  if (review.status !== InventoryReviewStatus.DRAFT) {
    throw new Error("Solo se pueden modificar revisiones en estado DRAFT");
  }

  // Obtener la cantidad actual del inventario (expectedQty de InventoryLine activa)
  const inventoryLine = await prisma.inventoryLine.findFirst({
    where: {
      itemId,
      isActive: true,
    },
    select: { expectedQty: true },
  });

  const quantityBefore = inventoryLine?.expectedQty || 0;

  // Si la cantidad no cambió, eliminar el cambio si existe
  if (quantityBefore === quantityAfter) {
    await prisma.inventoryReviewItemChange.deleteMany({
      where: {
        reviewId,
        itemId,
      },
    });

    revalidatePath(`/host/cleanings/${review.cleaningId}`);
    return { deleted: true };
  }

  // Validar razón si la cantidad cambió
  if (!reasonStr || !Object.values(InventoryChangeReason).includes(reasonStr as InventoryChangeReason)) {
    throw new Error("Debe especificar una razón válida para el cambio");
  }

  const reason = reasonStr as InventoryChangeReason;

  if (reason === InventoryChangeReason.OTHER && !reasonOtherText) {
    throw new Error("Debe especificar la razón cuando selecciona 'Otro'");
  }

  // Validar longitud de nota
  if (note && note.length > 200) {
    throw new Error("La nota no puede tener más de 200 caracteres");
  }

  // Buscar cambio existente
  const existingChange = await prisma.inventoryReviewItemChange.findFirst({
    where: {
      reviewId,
      itemId,
    },
  });

  const changeData = {
    tenantId: tenant.id,
    reviewId,
    itemId,
    quantityBefore,
    quantityAfter,
    reason,
    reasonOtherText,
    note,
    status: InventoryChangeStatus.PENDING,
  };

  if (existingChange) {
    // Actualizar cambio existente
    const updated = await prisma.inventoryReviewItemChange.update({
      where: { id: existingChange.id },
      data: changeData,
    });

    revalidatePath(`/host/cleanings/${review.cleaningId}`);
    return { id: updated.id, quantityBefore: updated.quantityBefore, quantityAfter: updated.quantityAfter };
  } else {
    // Crear nuevo cambio
    const created = await prisma.inventoryReviewItemChange.create({
      data: changeData,
    });

    revalidatePath(`/host/cleanings/${review.cleaningId}`);
    return { id: created.id, quantityBefore: created.quantityBefore, quantityAfter: created.quantityAfter };
  }
}

/**
 * Crea un reporte de incidencia.
 */
export async function createInventoryReport(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const reviewId = formData.get("reviewId")?.toString() || null;
  const cleaningId = formData.get("cleaningId")?.toString() || null;
  const itemId = formData.get("itemId")?.toString();
  const reportId = formData.get("reportId")?.toString() || null; // ID del reporte existente a actualizar
  const typeStr = formData.get("type")?.toString();
  const severityStr = formData.get("severity")?.toString() || "INFO";
  const description = formData.get("description")?.toString().trim() || null;

  if (!itemId || !typeStr) {
    throw new Error("Faltan datos requeridos");
  }

  if (!Object.values(InventoryReportType).includes(typeStr as InventoryReportType)) {
    throw new Error("Tipo de reporte inválido");
  }

  if (!Object.values(InventoryReportSeverity).includes(severityStr as InventoryReportSeverity)) {
    throw new Error("Severidad inválida");
  }

  const type = typeStr as InventoryReportType;
  const severity = severityStr as InventoryReportSeverity;

  // Verificar que el item existe
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    select: { id: true, tenantId: true },
  });

  if (!item) {
    throw new Error("Item no encontrado");
  }

  if (item.tenantId !== tenant.id) {
    throw new Error("No tienes permiso para este item");
  }

  // Obtener el usuario que crea el reporte
  // Prioridad: 1) reviewedByUserId de la revisión, 2) assignedToId de la limpieza, 3) cualquier Cleaner del tenant
  let createdByUserId: string | null = null;

  // 1. Intentar obtener el usuario de la revisión
  if (reviewId) {
    const review = await prisma.inventoryReview.findUnique({
      where: { id: reviewId },
      select: { id: true, tenantId: true, reviewedByUserId: true },
    });

    if (!review) {
      throw new Error("Revisión no encontrada");
    }

    if (review.tenantId !== tenant.id) {
      throw new Error("No tienes permiso para esta revisión");
    }

    if (review.reviewedByUserId) {
      createdByUserId = review.reviewedByUserId;
    }
  }

  // 2. Si no hay usuario de la revisión, intentar obtenerlo de la limpieza
  if (!createdByUserId && cleaningId) {
    const cleaning = await prisma.cleaning.findUnique({
      where: { id: cleaningId },
      select: { assignedToId: true, tenantId: true },
    });

    if (cleaning && cleaning.tenantId === tenant.id && cleaning.assignedToId) {
      createdByUserId = cleaning.assignedToId;
    }
  }

  // 3. Si aún no hay usuario, buscar cualquier Cleaner del tenant como fallback
  if (!createdByUserId) {
    const defaultUser = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: "CLEANER" },
    });

    if (!defaultUser) {
      // Si no hay Cleaner, intentar con cualquier usuario del tenant como último recurso
      const anyUser = await prisma.user.findFirst({
        where: { tenantId: tenant.id },
      });

      if (!anyUser) {
        throw new Error("No se encontró un usuario para crear el reporte");
      }

      createdByUserId = anyUser.id;
    } else {
      createdByUserId = defaultUser.id;
    }
  }

  // Si se proporciona reportId, actualizar ese reporte específico
  // Si no, buscar si ya existe un reporte para este item en esta revisión
  let existingReport = null;
  
  if (reportId) {
    // Buscar el reporte específico por ID
    existingReport = await prisma.inventoryReport.findFirst({
      where: {
        id: reportId,
        tenantId: tenant.id,
        status: InventoryReportStatus.PENDING,
      },
    });
  } else if (reviewId) {
    // Buscar por reviewId + itemId
    existingReport = await prisma.inventoryReport.findFirst({
      where: {
        tenantId: tenant.id,
        reviewId,
        itemId,
        status: InventoryReportStatus.PENDING,
      },
    });
  }

  let report;
  if (existingReport) {
    // Actualizar el reporte existente
    report = await prisma.inventoryReport.update({
      where: { id: existingReport.id },
      data: {
        type,
        severity,
        description,
        updatedAt: new Date(),
      },
    });
  } else {
    // Crear nuevo reporte
    report = await prisma.inventoryReport.create({
      data: {
        tenantId: tenant.id,
        reviewId,
        cleaningId,
        itemId,
        type,
        severity,
        description,
        status: InventoryReportStatus.PENDING,
        createdByUserId: createdByUserId,
      },
    });
  }

  if (reviewId) {
    const review = await prisma.inventoryReview.findUnique({
      where: { id: reviewId },
      select: { cleaningId: true },
    });

    if (review) {
      revalidatePath(`/host/cleanings/${review.cleaningId}`);
    }
  }

  return { id: report.id, status: report.status };
}

/**
 * Elimina un reporte de inventario (solo si está en estado PENDING).
 */
export async function deleteInventoryReport(reportId: string) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const report = await prisma.inventoryReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      tenantId: true,
      status: true,
      reviewId: true,
    },
  });

  if (!report) {
    throw new Error("Reporte no encontrado");
  }

  if (report.tenantId !== tenant.id) {
    throw new Error("No tienes permiso para este reporte");
  }

  if (report.status !== InventoryReportStatus.PENDING) {
    throw new Error("Solo se pueden eliminar reportes en estado PENDING");
  }

  await prisma.inventoryReport.delete({
    where: { id: reportId },
  });

  if (report.reviewId) {
    const review = await prisma.inventoryReview.findUnique({
      where: { id: report.reviewId },
      select: { cleaningId: true },
    });

    if (review) {
      revalidatePath(`/host/cleanings/${review.cleaningId}`);
    }
  }

  return { success: true };
}

/**
 * Obtiene las líneas de inventario activas de una propiedad para la revisión.
 */
export async function getActiveInventoryLines(propertyId: string) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return [];
  }

  const lines = await prisma.inventoryLine.findMany({
    where: {
      tenantId: tenant.id,
      propertyId,
      isActive: true,
    },
    select: {
      id: true,
      area: true,
      expectedQty: true,
      variantKey: true,
      variantValue: true,
      brand: true,
      model: true,
      color: true,
      size: true,
      condition: true,
      priority: true,
      notes: true,
      item: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
    },
    orderBy: [
      { item: { name: "asc" } },
      { area: "asc" },
    ],
  });

  // Retornar cada línea individualmente, sin agrupar ni sumar
  // Cada línea representa un item específico en un área específica con una variante específica
  return lines.map((line) => ({
    id: line.id,
    area: line.area,
    expectedQty: line.expectedQty,
    variantKey: line.variantKey,
    variantValue: line.variantValue,
    item: line.item,
    allLines: [{
      id: line.id,
      area: line.area,
      expectedQty: line.expectedQty,
      variantKey: line.variantKey,
      variantValue: line.variantValue,
      brand: line.brand,
      model: line.model,
      color: line.color,
      size: line.size,
      condition: line.condition,
      priority: line.priority,
      notes: line.notes,
    }],
  }));
}

/**
 * Obtiene una revisión de inventario con todos sus datos.
 */
export async function getInventoryReview(cleaningId: string) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return null;
  }

  const review = await prisma.inventoryReview.findUnique({
    where: { cleaningId },
    include: {
      itemChanges: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          evidence: {
            include: {
              asset: {
                select: {
                  id: true,
                  publicUrl: true,
                  variant: true,
                },
              },
            },
          },
        },
      },
      reports: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          evidence: {
            include: {
              asset: {
                select: {
                  id: true,
                  publicUrl: true,
                  variant: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!review || review.tenantId !== tenant.id) {
    return null;
  }

  return review;
}

/**
 * Obtiene el estado de una revisión de inventario (solo id y status) para mostrar rápidamente.
 */
export async function getInventoryReviewStatus(cleaningId: string) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return null;
  }

  const review = await prisma.inventoryReview.findUnique({
    where: { cleaningId },
    select: {
      id: true,
      status: true,
      tenantId: true, // Incluir tenantId para la verificación
    },
  });

  if (!review || review.tenantId !== tenant.id) {
    return null;
  }

  return review;
}

