"use client";

import Image from "next/image";
import { itemCategoryLabel } from "@/lib/inventory-i18n";

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
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  size?: string | null;
  condition?: string | null;
  priority?: string | null;
  notes?: string | null;
}

interface InventoryItemPreviewModalProps {
  isOpen: boolean;
  line: InventoryLine | null;
  itemThumbs: Array<string | null>;
  onClose: () => void;
}

export default function InventoryItemPreviewModal({
  isOpen,
  line,
  itemThumbs,
  onClose,
}: InventoryItemPreviewModalProps) {
  if (!isOpen || !line) return null;

  const getVariantLabel = (variantKey: string | null, variantValue: string | null) => {
    if (!variantKey || !variantValue) return null;
    const variantLabels: Record<string, Record<string, string>> = {
      bed_size: {
        twin: "Individual",
        full: "Full",
        queen: "Queen",
        king: "King",
        california_king: "California King",
      },
    };
    const label = variantLabels[variantKey]?.[variantValue] || variantValue;
    return `${variantKey === "bed_size" ? "Tamaño" : variantKey}: ${label}`;
  };

  const getConditionLabel = (condition: string | null | undefined) => {
    if (!condition) return null;
    switch (condition) {
      case "NEW":
        return "Nuevo";
      case "USED_LT_1Y":
        return "Usado menos de 1 año";
      case "USED_GT_1Y":
        return "Usado más de 1 año";
      default:
        return condition;
    }
  };

  const getPriorityLabel = (priority: string | null | undefined) => {
    if (!priority) return null;
    switch (priority) {
      case "HIGH":
        return "Alta";
      case "MEDIUM":
        return "Media";
      case "LOW":
        return "Baja";
      default:
        return priority;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-neutral-200 px-4 py-3 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-neutral-900">
            Detalle del item
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 space-y-4">
          {/* Imágenes */}
          {itemThumbs.some((thumb) => thumb !== null) && (
            <div>
              <p className="text-sm font-medium text-neutral-700 mb-2">Fotos</p>
              <div className="flex gap-2 overflow-x-auto">
                {itemThumbs.map((thumb, index) => {
                  if (!thumb) return null;
                  return (
                    <div
                      key={index}
                      className="flex-shrink-0 w-24 h-24 rounded-lg bg-neutral-200 overflow-hidden"
                    >
                      <Image
                        src={thumb}
                        alt={`${line.item.name} - Foto ${index + 1}`}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nombre y categoría */}
          <div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-1">
              {line.item.name}
            </h3>
            <p className="text-sm text-neutral-500">{itemCategoryLabel(line.item.category)}</p>
          </div>

          {/* Variante */}
          {getVariantLabel(line.variantKey, line.variantValue) && (
            <div>
              <p className="text-sm font-medium text-neutral-700 mb-1">Variante</p>
              <p className="text-sm text-neutral-900">
                {getVariantLabel(line.variantKey, line.variantValue)}
              </p>
            </div>
          )}

          {/* Cantidad */}
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Cantidad</p>
            <p className="text-lg font-semibold text-neutral-900">
              {line.expectedQty}
            </p>
          </div>

          {/* Ubicación */}
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Ubicación</p>
            <p className="text-sm text-neutral-900">{line.area}</p>
          </div>

          {/* Detalles adicionales */}
          {(line.brand || line.model || line.color || line.size) && (
            <div>
              <p className="text-sm font-medium text-neutral-700 mb-2">Detalles</p>
              <div className="grid grid-cols-2 gap-3">
                {line.brand && (
                  <div>
                    <p className="text-xs text-neutral-500">Marca</p>
                    <p className="text-sm text-neutral-900">{line.brand}</p>
                  </div>
                )}
                {line.model && (
                  <div>
                    <p className="text-xs text-neutral-500">Modelo</p>
                    <p className="text-sm text-neutral-900">{line.model}</p>
                  </div>
                )}
                {line.color && (
                  <div>
                    <p className="text-xs text-neutral-500">Color</p>
                    <p className="text-sm text-neutral-900">{line.color}</p>
                  </div>
                )}
                {line.size && (
                  <div>
                    <p className="text-xs text-neutral-500">Tamaño</p>
                    <p className="text-sm text-neutral-900">{line.size}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Condición y Prioridad */}
          {(line.condition || line.priority) && (
            <div>
              <p className="text-sm font-medium text-neutral-700 mb-2">Estado</p>
              <div className="flex gap-3">
                {line.condition && (
                  <div>
                    <p className="text-xs text-neutral-500">Condición</p>
                    <p className="text-sm text-neutral-900">
                      {getConditionLabel(line.condition)}
                    </p>
                  </div>
                )}
                {line.priority && (
                  <div>
                    <p className="text-xs text-neutral-500">Prioridad</p>
                    <p className="text-sm text-neutral-900">
                      {getPriorityLabel(line.priority)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notas */}
          {line.notes && (
            <div>
              <p className="text-sm font-medium text-neutral-700 mb-1">Notas</p>
              <p className="text-sm text-neutral-600">{line.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-4 py-3 flex items-center justify-end sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

