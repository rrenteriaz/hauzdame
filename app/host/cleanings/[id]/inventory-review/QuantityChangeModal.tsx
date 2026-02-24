"use client";

import { useState } from "react";
import { InventoryChangeReason } from "@prisma/client";

interface QuantityChangeModalProps {
  isOpen: boolean;
  itemId: string;
  itemName: string;
  quantityBefore: number;
  onClose: () => void;
  onSubmit: (
    quantityAfter: number,
    reason: InventoryChangeReason,
    reasonOtherText: string | null,
    note: string | null
  ) => void;
}

const REASON_OPTIONS: { value: InventoryChangeReason; label: string }[] = [
  { value: "ROUTINE_COUNT", label: "Conteo de rutina" },
  { value: "PREVIOUS_ERROR", label: "Error previo" },
  { value: "DAMAGED", label: "Se rompió / dañó" },
  { value: "REPLACED", label: "Se reemplazó" },
  { value: "LOST", label: "Se extravió" },
  { value: "MOVED", label: "Se movió" },
  { value: "OTHER", label: "Otro" },
];

export default function QuantityChangeModal({
  isOpen,
  itemId,
  itemName,
  quantityBefore,
  onClose,
  onSubmit,
}: QuantityChangeModalProps) {
  const [quantityAfter, setQuantityAfter] = useState(quantityBefore);
  const [selectedReason, setSelectedReason] = useState<InventoryChangeReason | null>(null);
  const [reasonOtherText, setReasonOtherText] = useState("");
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!selectedReason) {
      alert("Debes seleccionar una razón para el cambio");
      return;
    }

    if (selectedReason === "OTHER" && !reasonOtherText.trim()) {
      alert("Debes especificar la razón cuando seleccionas 'Otro'");
      return;
    }

    if (note.length > 200) {
      alert("La nota no puede tener más de 200 caracteres");
      return;
    }

    onSubmit(
      quantityAfter,
      selectedReason,
      selectedReason === "OTHER" ? reasonOtherText.trim() : null,
      note.trim() || null
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-neutral-900">
            ¿Por qué cambió la cantidad?
          </h2>
          <p className="text-sm text-neutral-600 mt-1">{itemName}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Cantidad */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Cantidad verificada
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantityAfter(Math.max(0, quantityAfter - 1))}
                className="w-10 h-10 rounded border border-neutral-300 flex items-center justify-center hover:bg-neutral-50"
              >
                −
              </button>
              <input
                type="number"
                value={quantityAfter}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 0) {
                    setQuantityAfter(val);
                  }
                }}
                className="w-20 text-center border border-neutral-300 rounded px-3 py-2"
                min="0"
              />
              <button
                type="button"
                onClick={() => setQuantityAfter(quantityAfter + 1)}
                className="w-10 h-10 rounded border border-neutral-300 flex items-center justify-center hover:bg-neutral-50"
              >
                +
              </button>
              <span className="text-sm text-neutral-500">
                (antes: {quantityBefore})
              </span>
            </div>
          </div>

          {/* Razón */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Razón del cambio <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {REASON_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedReason(option.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                    selectedReason === option.value
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Razón "Otro" */}
          {selectedReason === "OTHER" && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Especifica la razón <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={reasonOtherText}
                onChange={(e) => setReasonOtherText(e.target.value)}
                placeholder="Describe la razón del cambio..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
          )}

          {/* Nota opcional */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Nota (opcional, máx. 200 caracteres)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Agrega una nota adicional..."
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg resize-none"
            />
            <p className="text-xs text-neutral-500 mt-1">
              {note.length}/200 caracteres
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Guardar cambio
          </button>
        </div>
      </div>
    </div>
  );
}

