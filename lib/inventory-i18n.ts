import {
  InventoryReportType,
  InventoryReportSeverity,
  InventoryReportResolution,
  InventoryChangeReason,
  InventoryCategory,
} from "@prisma/client";

/**
 * Mapeo centralizado de enums de inventario a etiquetas en español para UI
 */

export function reportTypeLabel(type: InventoryReportType): string {
  const labels: Record<InventoryReportType, string> = {
    DAMAGED_WORKS: "Dañado, pero funciona",
    DAMAGED_NOT_WORKING: "Dañado y no funciona",
    MISSING_PHYSICAL: "No está físicamente",
    REPLACED_DIFFERENT: "Fue reemplazado / es diferente",
    DETAILS_MISMATCH: "Marca/detalle no coincide",
    OTHER: "Otro",
  };
  return labels[type] || "Desconocido";
}

export function reportSeverityLabel(severity: InventoryReportSeverity): string {
  const labels: Record<InventoryReportSeverity, string> = {
    URGENT: "Urgente",
    IMPORTANT: "Importante",
    INFO: "Informativo",
  };
  return labels[severity] || "Desconocido";
}

export function reportResolutionLabel(resolution: InventoryReportResolution): string {
  const labels: Record<InventoryReportResolution, string> = {
    REPAIR: "Reparar",
    KEEP_USING: "Seguir usando",
    REPLACE_AND_DISCARD: "Reemplazar y descartar",
    DISCARD: "Descartar",
    STORE: "Almacenar",
    MARK_LOST: "Marcar como perdido",
    UPDATE_ITEM_TO_NEW: "Actualizar item a nuevo",
    MARK_TO_REPLACE: "Marcar para reemplazar",
  };
  return labels[resolution] || "Desconocido";
}

export function changeReasonLabel(reason: InventoryChangeReason): string {
  const labels: Record<InventoryChangeReason, string> = {
    ROUTINE_COUNT: "Conteo de rutina",
    PREVIOUS_ERROR: "Error previo",
    DAMAGED: "Se rompió / dañó",
    REPLACED: "Se reemplazó",
    LOST: "Se extravió",
    MOVED: "Se movió",
    OTHER: "Otro",
  };
  return labels[reason] || "Desconocido";
}

export function itemCategoryLabel(category: string | InventoryCategory): string {
  const labels: Record<InventoryCategory, string> = {
    FURNITURE_EQUIPMENT: "Muebles y equipamiento",
    LINENS: "Blancos",
    TABLEWARE_UTENSILS: "Vajilla y utensilios",
    DECOR: "Decoración",
    KITCHEN_ACCESSORIES: "Accesorios de cocina",
    KEYS_ACCESS: "Llaves y acceso",
    CONSUMABLES: "Consumibles",
    OTHER: "Otro",
  };
  
  // Si está en el mapping, devolver el label
  if (category in labels) {
    return labels[category as InventoryCategory];
  }
  
  // Fallback: formatear de forma humana
  // Reemplazar "_" por " ", lowercase, y capitalizar primera letra de cada palabra
  const formatted = category
    .replace(/_/g, " ")
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  
  return formatted;
}

