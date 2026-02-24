"use client";

import { useEffect, useState } from "react";
import { InventoryLineWithItem } from "@/lib/inventory";
import { getCategoryLabel, getVariantLabel } from "@/lib/inventory-suggestions";
import { InventoryCondition, InventoryPriority } from "@prisma/client";
import { getInventoryItemThumbsAction } from "@/app/host/inventory/actions";
import { editInventoryCache } from "@/lib/client/editInventoryCache";
import Image from "next/image";

interface ViewInventoryItemModalProps {
  line: InventoryLineWithItem;
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

function getConditionLabel(condition: InventoryCondition): string {
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
}

function getPriorityLabel(priority: InventoryPriority): string {
  switch (priority) {
    case "LOW":
      return "Baja";
    case "MEDIUM":
      return "Media";
    case "HIGH":
      return "Alta";
    default:
      return priority;
  }
}

export default function ViewInventoryItemModal({
  line,
  propertyId,
  isOpen,
  onClose,
  onEdit,
}: ViewInventoryItemModalProps) {
  const [thumbs, setThumbs] = useState<Array<string | null>>([null, null, null]);
  const [loadingThumbs, setLoadingThumbs] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && line.item.id) {
      setLoadingThumbs(true);
      getInventoryItemThumbsAction(line.item.id)
        .then((result) => {
          setThumbs(result);
        })
        .catch((error) => {
          console.error("Error loading thumbs:", error);
        })
        .finally(() => {
          setLoadingThumbs(false);
        });
    }
  }, [isOpen, line.item.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-neutral-900">
            Detalle del item
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900 transition-colors p-1"
            aria-label="Cerrar"
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

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Imágenes */}
          {loadingThumbs ? (
            <div className="text-center py-4">
              <p className="text-sm text-neutral-500">Cargando imágenes...</p>
            </div>
          ) : thumbs.some((thumb) => thumb !== null) ? (
            <div className="flex gap-3">
              {thumbs.map((thumb, index) => {
                if (!thumb) return null;
                return (
                  <div
                    key={index}
                    className="relative w-32 h-32 rounded-lg border border-neutral-300 bg-neutral-50 overflow-hidden flex-shrink-0"
                  >
                    <Image
                      src={thumb}
                      alt={`Foto ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Información básica */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">
                {line.item.name}
                {line.variantKey && line.variantValue && (
                  <span className="text-neutral-500 font-normal">
                    {" — "}
                    {getVariantLabel(line.variantKey, line.variantValue)}
                  </span>
                )}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Categoría</p>
                <p className="text-sm text-neutral-900">
                  {getCategoryLabel(line.item.category)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Área</p>
                <p className="text-sm text-neutral-900">{line.area}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Cantidad</p>
                <p className="text-sm text-neutral-900">{line.expectedQty}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Condición</p>
                <p className="text-sm text-neutral-900">
                  {getConditionLabel(line.condition)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Prioridad</p>
                <p className="text-sm text-neutral-900">
                  {getPriorityLabel(line.priority)}
                </p>
              </div>
            </div>

            {/* Detalles adicionales */}
            {(line.brand ||
              line.model ||
              line.serialNumber ||
              line.color ||
              line.size) && (
              <div className="pt-4 border-t border-neutral-200">
                <p className="text-xs font-medium text-neutral-500 mb-3">
                  Detalles adicionales
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {line.brand && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 mb-1">Marca</p>
                      <p className="text-sm text-neutral-900">{line.brand}</p>
                    </div>
                  )}
                  {line.model && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 mb-1">Modelo</p>
                      <p className="text-sm text-neutral-900">{line.model}</p>
                    </div>
                  )}
                  {line.serialNumber && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 mb-1">
                        Número de serie
                      </p>
                      <p className="text-sm text-neutral-900">{line.serialNumber}</p>
                    </div>
                  )}
                  {line.color && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 mb-1">Color</p>
                      <p className="text-sm text-neutral-900">{line.color}</p>
                    </div>
                  )}
                  {line.size && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 mb-1">Tamaño</p>
                      <p className="text-sm text-neutral-900">{line.size}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notas */}
            {line.notes && (
              <div className="pt-4 border-t border-neutral-200">
                <p className="text-xs font-medium text-neutral-500 mb-2">Notas</p>
                <p className="text-sm text-neutral-900 whitespace-pre-wrap">
                  {line.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            Cerrar
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onEdit();
                onClose();
              }}
              onMouseEnter={() => editInventoryCache.prefetch(propertyId, line.id)}
              onFocus={() => editInventoryCache.prefetch(propertyId, line.id)}
              onTouchStart={() => editInventoryCache.prefetch(propertyId, line.id)}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

