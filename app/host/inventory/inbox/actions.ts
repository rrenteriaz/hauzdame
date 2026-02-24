// app/host/inventory/inbox/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import {
  InventoryChangeStatus,
  InventoryReportStatus,
  InventoryReportResolution,
  InventoryReportSeverity,
} from "@prisma/client";

/**
 * Obtiene el resumen de pendientes y resueltos del inbox de inventario.
 */
export async function getInventoryInboxSummary() {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return { totalPendings: 0, urgentReports: 0, totalResolved: 0 };
  }

  const [pendingChanges, pendingReports, resolvedChanges, resolvedReports] = await Promise.all([
    prisma.inventoryReviewItemChange.count({
      where: {
        tenantId: tenant.id,
        status: InventoryChangeStatus.PENDING,
      },
    }),
    prisma.inventoryReport.count({
      where: {
        tenantId: tenant.id,
        status: InventoryReportStatus.PENDING,
      },
    }),
    prisma.inventoryReviewItemChange.count({
      where: {
        tenantId: tenant.id,
        status: {
          in: [InventoryChangeStatus.ACCEPTED, InventoryChangeStatus.REJECTED, InventoryChangeStatus.APPLIED],
        },
      },
    }),
    prisma.inventoryReport.count({
      where: {
        tenantId: tenant.id,
        status: InventoryReportStatus.RESOLVED,
      },
    }),
  ]);

  const urgentReports = await prisma.inventoryReport.count({
    where: {
      tenantId: tenant.id,
      status: InventoryReportStatus.PENDING,
      severity: InventoryReportSeverity.URGENT,
    },
  });

  return {
    totalPendings: pendingChanges + pendingReports,
    urgentReports,
    totalResolved: resolvedChanges + resolvedReports,
  };
}

interface InboxFilters {
  propertyId?: string;
  type?: "CHANGE" | "REPORT";
  severity?: InventoryReportSeverity;
  status?: "PENDING" | "RESOLVED";
  dateRange?: "7d" | "30d" | "all";
}

/**
 * Obtiene los items del inbox (cambios y reportes) con filtros.
 */
export async function getInventoryInboxItems(filters: InboxFilters = {}) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return [];
  }

  const { propertyId, type, severity, status = "PENDING", dateRange = "all" } = filters;

  // Calcular fecha límite si aplica
  let dateFrom: Date | undefined;
  if (dateRange === "7d") {
    dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 7);
  } else if (dateRange === "30d") {
    dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
  }

  // Obtener cambios
  const changes =
    type !== "REPORT"
      ? await prisma.inventoryReviewItemChange.findMany({
          where: {
            tenantId: tenant.id,
            status:
              status === "PENDING"
                ? InventoryChangeStatus.PENDING
                : {
                    in: [
                      InventoryChangeStatus.ACCEPTED,
                      InventoryChangeStatus.APPLIED,
                      InventoryChangeStatus.REJECTED,
                    ],
                  },
            ...(dateFrom ? { createdAt: { gte: dateFrom } } : {}),
            ...(propertyId
              ? {
                  review: {
                    propertyId,
                  },
                }
              : {}),
          },
          include: {
            review: {
              include: {
                cleaning: {
                  include: {
                    property: {
                      select: {
                        id: true,
                        name: true,
                        shortName: true,
                      },
                    },
                  },
                },
                reviewedBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            item: {
              include: {
                inventoryItemAssets: {
                  where: { position: 1 },
                  include: {
                    asset: true,
                  },
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  // Obtener reportes
  const reports =
    type !== "CHANGE"
      ? await prisma.inventoryReport.findMany({
          where: {
            tenantId: tenant.id,
            status:
              status === "PENDING"
                ? InventoryReportStatus.PENDING
                : {
                    in: [
                      InventoryReportStatus.RESOLVED,
                      InventoryReportStatus.ACKNOWLEDGED,
                      InventoryReportStatus.REJECTED,
                    ],
                  },
            ...(severity ? { severity } : {}),
            ...(propertyId
              ? {
                  OR: [
                    { review: { propertyId } },
                    { cleaning: { propertyId } },
                  ],
                }
              : {}),
            ...(dateFrom ? { createdAt: { gte: dateFrom } } : {}),
          },
          include: {
            review: {
              include: {
                property: {
                  select: {
                    id: true,
                    name: true,
                    shortName: true,
                  },
                },
              },
            },
            cleaning: {
              include: {
                property: {
                  select: {
                    id: true,
                    name: true,
                    shortName: true,
                  },
                },
              },
            },
            item: {
              include: {
                inventoryItemAssets: {
                  where: { position: 1 },
                  include: {
                    asset: true,
                  },
                  take: 1,
                },
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  // Combinar y formatear resultados
  const items = [
    ...changes.map((change) => ({
      type: "CHANGE" as const,
      id: change.id,
      itemId: change.itemId,
      itemName: change.item.name,
      itemThumbnail: change.item.inventoryItemAssets[0]?.asset?.publicUrl || null,
      property:
        change.review?.cleaning?.property?.shortName ||
        change.review?.cleaning?.property?.name ||
        "N/A",
      propertyId: change.review?.cleaning?.propertyId || null,
      cleaningId: change.review?.cleaningId || null,
      quantityBefore: change.quantityBefore,
      quantityAfter: change.quantityAfter,
      reason: change.reason,
      reasonOtherText: change.reasonOtherText,
      note: change.note,
      status: change.status,
      createdBy: change.review?.reviewedBy?.name || "Cleaner",
      createdAt: change.createdAt,
    })),
    ...reports.map((report) => ({
      type: "REPORT" as const,
      id: report.id,
      itemId: report.itemId,
      itemName: report.item.name,
      itemThumbnail: report.item.inventoryItemAssets[0]?.asset?.publicUrl || null,
      property:
        report.review?.property?.shortName ||
        report.review?.property?.name ||
        report.cleaning?.property?.shortName ||
        report.cleaning?.property?.name ||
        "N/A",
      propertyId:
        report.review?.propertyId || report.cleaning?.propertyId || null,
      cleaningId: report.cleaningId || report.review?.cleaningId || null,
      reportType: report.type,
      severity: report.severity,
      description: report.description,
      status: report.status,
      managerResolution: report.managerResolution,
      createdBy: report.createdBy?.name || "Cleaner",
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt,
    })),
  ];

  // Ordenar por fecha (más recientes primero)
  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return items;
}

/**
 * Aplica un cambio de cantidad (acepta y actualiza el inventario).
 */
export async function applyInventoryChange(changeId: string) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const change = await prisma.inventoryReviewItemChange.findUnique({
    where: { id: changeId },
    include: {
      review: {
        include: {
          cleaning: true,
        },
      },
    },
  });

  if (!change) {
    throw new Error("Cambio no encontrado");
  }

  if (change.tenantId !== tenant.id) {
    throw new Error("No tienes permiso para este cambio");
  }

  if (change.status !== InventoryChangeStatus.PENDING) {
    throw new Error("Este cambio ya fue procesado");
  }

  // Actualizar todas las líneas activas del item en la propiedad del cambio
  const propertyId = change.review?.cleaning?.propertyId;
  if (!propertyId) {
    throw new Error("No se pudo determinar la propiedad");
  }

  // Buscar la línea de inventario correspondiente
  const inventoryLine = await prisma.inventoryLine.findFirst({
    where: {
      tenantId: tenant.id,
      propertyId,
      itemId: change.itemId,
      isActive: true,
    },
  });

  if (inventoryLine) {
    // Actualizar la cantidad
    await prisma.inventoryLine.update({
      where: { id: inventoryLine.id },
      data: { expectedQty: change.quantityAfter },
    });
  }

  // Marcar el cambio como aplicado
  await prisma.inventoryReviewItemChange.update({
    where: { id: changeId },
    data: {
      status: InventoryChangeStatus.APPLIED,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/host/inventory/inbox");
  revalidatePath("/host/dashboard");

  return { success: true };
}

/**
 * Rechaza un cambio de cantidad.
 */
export async function rejectInventoryChange(changeId: string) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const change = await prisma.inventoryReviewItemChange.findUnique({
    where: { id: changeId },
  });

  if (!change) {
    throw new Error("Cambio no encontrado");
  }

  if (change.tenantId !== tenant.id) {
    throw new Error("No tienes permiso para este cambio");
  }

  if (change.status !== InventoryChangeStatus.PENDING) {
    throw new Error("Este cambio ya fue procesado");
  }

  await prisma.inventoryReviewItemChange.update({
    where: { id: changeId },
    data: {
      status: InventoryChangeStatus.REJECTED,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/host/inventory/inbox");
  revalidatePath("/host/dashboard");

  return { success: true };
}

/**
 * Resuelve un reporte de inventario con una resolución específica.
 */
export async function resolveInventoryReport(
  reportId: string,
  resolution: InventoryReportResolution
) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  // Obtener usuario actual (por ahora usar el primero disponible, TODO: obtener de sesión)
  const currentUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!currentUser) {
    throw new Error("No se encontró un usuario para resolver el reporte");
  }

  const report = await prisma.inventoryReport.findUnique({
    where: { id: reportId },
    include: {
      item: true,
    },
  });

  if (!report) {
    throw new Error("Reporte no encontrado");
  }

  if (report.tenantId !== tenant.id) {
    throw new Error("No tienes permiso para este reporte");
  }

  if (report.status !== InventoryReportStatus.PENDING) {
    throw new Error("Este reporte ya fue procesado");
  }

  // Actualizar el reporte
  await prisma.inventoryReport.update({
    where: { id: reportId },
    data: {
      status: InventoryReportStatus.RESOLVED,
      managerResolution: resolution,
      resolvedByUserId: currentUser.id,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Si la resolución implica sacar el item del inventario, actualizar las líneas activas
  if (
    resolution === InventoryReportResolution.DISCARD ||
    resolution === InventoryReportResolution.MARK_LOST ||
    resolution === InventoryReportResolution.STORE
  ) {
    // Desactivar todas las líneas activas del item
    await prisma.inventoryLine.updateMany({
      where: {
        tenantId: tenant.id,
        itemId: report.itemId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Archivar el item si no tiene líneas activas
    const activeLinesCount = await prisma.inventoryLine.count({
      where: {
        tenantId: tenant.id,
        itemId: report.itemId,
        isActive: true,
      },
    });

    if (activeLinesCount === 0) {
      await prisma.inventoryItem.update({
        where: { id: report.itemId },
        data: { archivedAt: new Date() },
      });
    }
  }

  revalidatePath("/host/inventory/inbox");
  revalidatePath("/host/dashboard");

  return { success: true };
}

