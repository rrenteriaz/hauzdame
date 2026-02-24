"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTenantVariantGroupAction } from "./actions";
import { normalizeKey } from "@/lib/normalize";

export default function CreateVariantGroupButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleLabelChange = (v: string) => {
    setLabel(v);
    if (!key || key === normalizeKey(label)) {
      setKey(normalizeKey(v));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await createTenantVariantGroupAction({
        key: key.trim() || normalizeKey(label),
        label: label.trim(),
      });
      setIsOpen(false);
      setLabel("");
      setKey("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-neutral-800"
      >
        Crear grupo
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !isPending && setIsOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-4">Crear grupo de variantes</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Label *
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Ej: Tamaño de cama"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Key * (slug, se genera automático)
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="bed-size"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => !isPending && setIsOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-neutral-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !label.trim()}
                  className="px-3 py-2 text-sm font-medium bg-black text-white rounded-lg disabled:opacity-50"
                >
                  {isPending ? "Creando..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
