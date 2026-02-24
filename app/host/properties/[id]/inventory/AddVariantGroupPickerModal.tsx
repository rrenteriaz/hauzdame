"use client";

import { useState, useEffect } from "react";
import {
  listTenantVariantGroupsAction,
  attachVariantGroupToItemByKeyAction,
} from "@/app/host/catalog/variant-groups/actions";

const CANONICAL_KEYS = ["bed_size", "material", "use"];

interface AddVariantGroupPickerModalProps {
  itemId: string;
  itemName: string;
  existingGroupKeys: string[];
  onClose: () => void;
  onAttach: () => void | Promise<void>;
}

interface VariantOption {
  id: string;
  label: string;
  valueNormalized: string;
}

interface TenantGroup {
  id: string;
  key: string;
  label: string;
  options?: VariantOption[];
}

export default function AddVariantGroupPickerModal({
  itemId,
  itemName,
  existingGroupKeys,
  onClose,
  onAttach,
}: AddVariantGroupPickerModalProps) {
  const [groups, setGroups] = useState<TenantGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<TenantGroup | null>(null);

  useEffect(() => {
    listTenantVariantGroupsAction()
      .then((data) =>
        setGroups(
          data.map((g) => ({
            id: g.id,
            key: g.key,
            label: g.label,
            options: g.options ?? [],
          }))
        )
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  const existingSet = new Set(existingGroupKeys);
  const filtered = groups
    .filter((g) => !existingSet.has(g.key))
    .filter(
      (g) =>
        search === "" ||
        g.label.toLowerCase().includes(search.toLowerCase()) ||
        g.key.toLowerCase().includes(search.toLowerCase())
    );

  const sorted = [...filtered].sort((a, b) => {
    const aCanon = CANONICAL_KEYS.indexOf(a.key);
    const bCanon = CANONICAL_KEYS.indexOf(b.key);
    if (aCanon >= 0 && bCanon >= 0) return aCanon - bCanon;
    if (aCanon >= 0) return -1;
    if (bCanon >= 0) return 1;
    return a.label.localeCompare(b.label);
  });

  const handleChooseGroup = async () => {
    if (!selectedGroup) return;
    setError(null);
    setIsPending(true);
    try {
      await attachVariantGroupToItemByKeyAction({ itemId, groupKey: selectedGroup.key });
      await Promise.resolve(onAttach());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
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
          Agregar grupo — {itemName}
        </h3>
        <p className="text-xs text-neutral-500 mb-3">
          Selecciona un grupo existente del tenant. No se duplican grupos.
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mb-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {selectedGroup ? (
          <>
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                ← Volver a la lista
              </button>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3 mb-4 bg-neutral-50">
              <p className="text-sm font-medium text-neutral-900 mb-2">
                {selectedGroup.label}
                <span className="text-neutral-500 font-normal ml-1">({selectedGroup.key})</span>
              </p>
              <p className="text-xs text-neutral-500 mb-2">Opciones de este grupo:</p>
              <div className="flex flex-wrap gap-1.5">
                {(selectedGroup.options ?? []).map((opt) => (
                  <span
                    key={opt.id}
                    className="inline-flex px-2 py-1 text-xs rounded-full bg-white border border-neutral-200"
                  >
                    {opt.label}
                  </span>
                ))}
                {(selectedGroup.options ?? []).length === 0 && (
                  <span className="text-xs text-neutral-500">Sin opciones</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleChooseGroup}
                disabled={isPending}
                className="flex-1 px-3 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50"
              >
                {isPending ? "Asociando…" : "Elegir grupo"}
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o key..."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 mb-3 text-sm"
            />

            {loading ? (
              <p className="text-sm text-neutral-500 py-4">Cargando grupos…</p>
            ) : sorted.length === 0 ? (
              <p className="text-sm text-neutral-500 py-4">
                {search
                  ? "No hay grupos que coincidan."
                  : "No hay grupos disponibles. Usa \"Crear grupo nuevo\" para crear uno."}
              </p>
            ) : (
              <div className="space-y-1 max-h-[280px] overflow-y-auto mb-4">
                {sorted.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGroup(g)}
                    disabled={isPending}
                    className="w-full text-left rounded-lg border border-neutral-200 px-3 py-2 hover:bg-neutral-50 disabled:opacity-50 text-sm"
                  >
                    {g.label}
                    <span className="text-neutral-500 ml-1">({g.key})</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
