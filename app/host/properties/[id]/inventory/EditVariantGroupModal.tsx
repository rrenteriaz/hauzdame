"use client";

import { useState, useRef, useEffect } from "react";
import { normalizeVariantValue } from "@/lib/inventory-normalize";
import type { VariantGroupPayload } from "@/app/host/inventory/actions";

interface EditVariantGroupModalProps {
  itemName: string;
  variantGroup: {
    key: string;
    label: string | null;
    options: Array<{ value: string; valueNormalized: string }>;
  };
  onClose: () => void;
  onSave: (payload: VariantGroupPayload) => Promise<void>;
}

export default function EditVariantGroupModal({
  itemName,
  variantGroup,
  onClose,
  onSave,
}: EditVariantGroupModalProps) {
  const [label, setLabel] = useState(variantGroup.label ?? "");
  const [optionInputs, setOptionInputs] = useState<string[]>(
    variantGroup.options.map((o) => o.value)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const optionsContainerRef = useRef<HTMLDivElement>(null);
  const focusLastOptionRef = useRef(false);

  const addOption = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    focusLastOptionRef.current = true;
    setOptionInputs((prev) => [...prev, ""]);
  };

  useEffect(() => {
    if (focusLastOptionRef.current && optionsContainerRef.current) {
      focusLastOptionRef.current = false;
      const inputs = optionsContainerRef.current.querySelectorAll<HTMLInputElement>(
        'input[placeholder^="Variante"]'
      );
      inputs[inputs.length - 1]?.focus();
    }
  }, [optionInputs.length]);

  const updateOption = (index: number, value: string) => {
    setOptionInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeOption = (index: number) => {
    if (optionInputs.length <= 2) return;
    setOptionInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const options = optionInputs
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (options.length < 2) {
      setError("Se requieren al menos 2 opciones");
      return;
    }

    const normalizedSet = new Set<string>();
    for (const o of options) {
      const n = normalizeVariantValue(o);
      if (normalizedSet.has(n)) {
        setError(`Opción duplicada: "${o}"`);
        return;
      }
      normalizedSet.add(n);
    }

    setIsPending(true);
    try {
      await onSave({
        key: variantGroup.key,
        label: label.trim() || null,
        options: options.map((v) => ({ value: v })),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
    } finally {
      setIsPending(false);
    }
  };

  const groupLabel = variantGroup.label || variantGroup.key;

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
          Editar grupo — {itemName}
        </h3>
        <p className="text-xs text-neutral-500 mb-3">
          Grupo &quot;{groupLabel}&quot; — agrega o elimina opciones
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mb-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Etiqueta (opcional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: Tipo de copas"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

          <div ref={optionsContainerRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-neutral-700">
                Opciones (mín. 2) *
              </label>
              <button
                type="button"
                onClick={(e) => addOption(e)}
                className="text-xs text-neutral-600 hover:text-neutral-900 px-2 py-1 -mx-2 -my-1 rounded hover:bg-neutral-100"
              >
                + Agregar opción
              </button>
            </div>
            <div className="space-y-1.5">
              {optionInputs.map((val, i) => (
                <div key={i} className="flex gap-1">
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => updateOption(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (val.trim()) addOption(e);
                      } else if (e.key === "Tab" && !e.shiftKey && val.trim()) {
                        const isLast = i === optionInputs.length - 1;
                        if (isLast) {
                          e.preventDefault();
                          addOption(e);
                        }
                      }
                    }}
                    placeholder={`Variante ${i + 1}`}
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={optionInputs.length <= 2}
                    className="p-2 text-neutral-400 hover:text-red-600 disabled:opacity-40"
                  >
                    <svg
                      className="w-4 h-4"
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
              ))}
            </div>
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
              {isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
