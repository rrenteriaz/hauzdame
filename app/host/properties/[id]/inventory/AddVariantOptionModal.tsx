"use client";

import { useState } from "react";
import { normalizeVariantValue } from "@/lib/inventory-normalize";

interface AddVariantOptionModalProps {
  itemName: string;
  variantGroupKey: string;
  existingOptions: Array<{ value: string; valueNormalized: string }>;
  onClose: () => void;
  onSave: (newOption: string) => Promise<void>;
}

export default function AddVariantOptionModal({
  itemName,
  variantGroupKey,
  existingOptions,
  onClose,
  onSave,
}: AddVariantOptionModalProps) {
  const [newOption, setNewOption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = newOption.trim();
    if (!trimmed) {
      setError("Escribe el nombre de la nueva opción");
      return;
    }

    const normalized = normalizeVariantValue(trimmed);
    const isDuplicate = existingOptions.some(
      (o) => o.valueNormalized === normalized
    );
    if (isDuplicate) {
      setError(`"${trimmed}" ya existe en las opciones`);
      return;
    }

    setIsPending(true);
    try {
      await onSave(trimmed);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-neutral-900 mb-1">
          Agregar opción — {itemName}
        </h3>
        <p className="text-xs text-neutral-500 mb-3">
          Nueva opción para el grupo &quot;{variantGroupKey}&quot;
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mb-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Nombre de la opción *
            </label>
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="Ej: California King"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-3 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Agregar opción"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
