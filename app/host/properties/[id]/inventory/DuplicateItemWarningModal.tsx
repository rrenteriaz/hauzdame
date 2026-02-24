"use client";

import { useEffect } from "react";

interface DuplicateItemWarningModalProps {
  isOpen: boolean;
  itemName: string;
  area: string;
  variantText?: string;
  existingQuantity?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DuplicateItemWarningModal({
  isOpen,
  itemName,
  area,
  variantText = "",
  existingQuantity,
  onConfirm,
  onCancel,
}: DuplicateItemWarningModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">
            Item ya existe
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-amber-600"
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
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-700 mb-2">
                El item <strong>{itemName}</strong>
                {variantText && <span className="text-neutral-600">{variantText}</span>} ya existe en el área <strong>{area}</strong>.
              </p>
              {existingQuantity !== undefined && (
                <p className="text-xs text-neutral-500 mb-3">
                  Cantidad actual: {existingQuantity}
                </p>
              )}
              <p className="text-sm text-neutral-600">
                ¿Deseas guardar otro item de todas formas o prefieres cancelar para modificar la cantidad del item existente?
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Guardar de todas formas
          </button>
        </div>
      </div>
    </div>
  );
}

