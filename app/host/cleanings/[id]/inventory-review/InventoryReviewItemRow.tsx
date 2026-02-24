"use client";

import { InventoryChangeReason, InventoryReportType, InventoryReportSeverity } from "@prisma/client";
import { changeReasonLabel } from "@/lib/inventory-i18n";

interface InventoryLine {
  id: string;
  area: string;
  expectedQty: number;
  variantKey: string | null;
  variantValue: string | null;
  item: {
    id: string;
    name: string;
    category: string;
  };
  allLines?: any[];
}

interface InventoryReviewItemChange {
  id: string;
  itemId: string;
  quantityBefore: number;
  quantityAfter: number;
  reason: InventoryChangeReason;
  reasonOtherText: string | null;
  note: string | null;
  status: string;
}

interface InventoryReport {
  id: string;
  itemId: string;
  type: InventoryReportType;
  severity: InventoryReportSeverity;
  description: string | null;
  status: string;
}

interface InventoryReviewItemRowProps {
  line: InventoryLine;
  currentQuantity: number;
  originalQuantity: number;
  change: InventoryReviewItemChange | undefined;
  report: InventoryReport | undefined;
  onQuantityChange: (newQuantity: number) => void;
  onReportClick: () => void;
  onItemClick?: () => void;
  disabled?: boolean;
}

export default function InventoryReviewItemRow({
  line,
  currentQuantity,
  originalQuantity,
  change,
  report,
  onQuantityChange,
  onReportClick,
  onItemClick,
  disabled = false,
}: InventoryReviewItemRowProps) {
  const hasQuantityChange = currentQuantity !== originalQuantity;
  const hasReport = !!report;


  const getVariantLabel = () => {
    if (!line.variantKey || !line.variantValue) return null;
    // Mapear valores comunes de variantes
    const variantLabels: Record<string, Record<string, string>> = {
      bed_size: {
        twin: "Individual",
        full: "Full",
        queen: "Queen",
        king: "King",
        california_king: "California King",
      },
    };
    const label = variantLabels[line.variantKey]?.[line.variantValue] || line.variantValue;
    return `${line.variantKey === "bed_size" ? "Tamaño" : line.variantKey}: ${label}`;
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-3 sm:p-4">
      {/* Layout responsive: stack en móvil, horizontal en desktop */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
        {/* Info del item */}
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={onItemClick}
        >
          {/* Línea 1: Título + tag/área */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base sm:text-lg font-semibold text-neutral-900 line-clamp-1 flex-1 min-w-0">{line.item.name}</h3>
            <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded shrink-0">
              {line.area}
            </span>
          </div>

          {/* Línea 2: "Registrada: X" + badge estado EN LA MISMA FILA */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm text-neutral-600">
              Registrada: {originalQuantity}
            </p>
            {/* Badge estado */}
            <div className="shrink-0">
              {!hasQuantityChange && !hasReport && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  OK
                </span>
              )}
              {hasQuantityChange && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                  Cambio
                </span>
              )}
              {hasReport && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                  Reporte {report.status === "PENDING" ? "(Pendiente)" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Línea 3 (móvil): Stepper + botón reportar - UNA SOLA FILA */}
          <div className="flex items-center justify-between gap-3 sm:hidden mb-1">
            {/* Stepper de cantidad - estilo pill */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onQuantityChange(Math.max(0, currentQuantity - 1))}
                disabled={disabled}
                className="h-10 w-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition text-base font-medium text-neutral-700"
              >
                −
              </button>
              <span className="w-8 text-center font-medium tabular-nums text-base text-neutral-900">{currentQuantity}</span>
              <button
                type="button"
                onClick={() => onQuantityChange(currentQuantity + 1)}
                disabled={disabled}
                className="h-10 w-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition text-base font-medium text-neutral-700"
              >
                +
              </button>
            </div>

            {/* Botón de reportar - estilo pill */}
            <button
              type="button"
              onClick={onReportClick}
              disabled={disabled}
              className="h-10 w-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-amber-600 hover:text-amber-700 hover:bg-amber-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="Reportar incidencia"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </button>
          </div>

          {/* Línea 4 (opcional): Subtexto - solo si existe y cabe */}
          {getVariantLabel() && (
            <p className="text-xs text-neutral-600 line-clamp-1 mb-1">
              {getVariantLabel()}
            </p>
          )}

          {/* Info del cambio - solo en desktop o si hay espacio */}
          {change && (
            <div className="text-xs text-neutral-600 mt-1 hidden sm:block">
              <span className="font-medium">Razón:</span> {changeReasonLabel(change.reason)}
              {change.reasonOtherText && ` - ${change.reasonOtherText}`}
              {change.note && (
                <div className="mt-1 text-neutral-500">
                  <span className="font-medium">Nota:</span> {change.note}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controles - Solo visible en desktop */}
        <div className="hidden sm:flex items-center justify-end gap-3 flex-shrink-0">
          {/* Stepper de cantidad - estilo pill para desktop también */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onQuantityChange(Math.max(0, currentQuantity - 1))}
              disabled={disabled}
              className="h-9 w-9 rounded-full border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition text-base font-medium text-neutral-700"
            >
              −
            </button>
            <span className="w-8 text-center font-medium tabular-nums text-base text-neutral-900">{currentQuantity}</span>
            <button
              type="button"
              onClick={() => onQuantityChange(currentQuantity + 1)}
              disabled={disabled}
              className="h-9 w-9 rounded-full border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition text-base font-medium text-neutral-700"
            >
              +
            </button>
          </div>

          {/* Botón de reportar - estilo pill para desktop */}
          <button
            type="button"
            onClick={onReportClick}
            disabled={disabled}
            className="h-9 w-9 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-amber-600 hover:text-amber-700 hover:bg-amber-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Reportar incidencia"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

