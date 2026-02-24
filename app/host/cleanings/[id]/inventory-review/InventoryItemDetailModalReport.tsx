"use client";

import { reportTypeLabel, reportSeverityLabel, changeReasonLabel, itemCategoryLabel } from "@/lib/inventory-i18n";

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

interface InventoryReport {
  id: string;
  itemId: string;
  type: string;
  severity: string;
  description: string | null;
}

interface InventoryReviewItemChange {
  id: string;
  itemId: string;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  reasonOtherText: string | null;
  note: string | null;
}

interface InventoryItemDetailModalReportProps {
  line: InventoryLine;
  originalQuantity: number;
  verifiedQuantity: number;
  change: InventoryReviewItemChange | undefined;
  report: InventoryReport | undefined;
  onClose: () => void;
}

export default function InventoryItemDetailModalReport({
  line,
  originalQuantity,
  verifiedQuantity,
  change,
  report,
  onClose,
}: InventoryItemDetailModalReportProps) {

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Detalle del item</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Nombre y categoría */}
          <div>
            <h3 className="text-base font-semibold text-neutral-900 mb-1">
              {line.item.name}
            </h3>
            <p className="text-sm text-neutral-600">
              {itemCategoryLabel(line.item.category)} · {line.area}
            </p>
          </div>

          {/* Cantidades */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-sm text-neutral-600">Registrada:</span>
              <span className="text-base font-medium text-neutral-900">{originalQuantity}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-sm text-neutral-600">Verificada:</span>
              <span className="text-base font-medium text-neutral-900">{verifiedQuantity}</span>
            </div>
          </div>

          {/* Cambio (si existe) */}
          {change && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <p className="text-sm font-medium text-amber-900">Cambio registrado</p>
              <div className="text-xs text-amber-800 space-y-1">
                <p>
                  <span className="font-medium">Razón:</span> {changeReasonLabel(change.reason as any)}
                  {change.reasonOtherText && ` - ${change.reasonOtherText}`}
                </p>
                {change.note && (
                  <p>
                    <span className="font-medium">Nota:</span> {change.note}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Reporte (si existe) */}
          {report && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <p className="text-sm font-medium text-red-900">Reporte registrado</p>
              <div className="text-xs text-red-800 space-y-1">
                <p>
                  <span className="font-medium">Tipo:</span> {reportTypeLabel(report.type as any)}
                </p>
                <p>
                  <span className="font-medium">Severidad:</span> {reportSeverityLabel(report.severity as any)}
                </p>
                {report.description && (
                  <p>
                    <span className="font-medium">Descripción:</span> {report.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg bg-black text-base font-medium text-white hover:bg-neutral-800 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

