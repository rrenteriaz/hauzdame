"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateTenantVariantGroupLabelAction,
  createVariantOptionAction,
  archiveVariantOptionAction,
} from "../actions";

interface Option {
  id: string;
  valueNormalized: string;
  label: string;
  sortOrder: number;
  isArchived: boolean;
}

interface Props {
  groupId: string;
  groupLabel: string;
  options: Option[];
  includeArchived: boolean;
  returnTo: string;
}

export default function VariantGroupOptionsSection({
  groupId,
  groupLabel,
  options,
  includeArchived,
  returnTo,
}: Props) {
  const router = useRouter();
  const [editingLabel, setEditingLabel] = useState(false);
  const [label, setLabel] = useState(groupLabel);
  const [showAddOption, setShowAddOption] = useState(false);
  const [optValue, setOptValue] = useState("");
  const [optLabel, setOptLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const handleSaveLabel = async () => {
    if (label.trim() === groupLabel) {
      setEditingLabel(false);
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      await updateTenantVariantGroupLabelAction({ groupId, label: label.trim() });
      setEditingLabel(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsPending(false);
    }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await createVariantOptionAction({
        groupId,
        value: optValue.trim(),
        label: optLabel.trim(),
      });
      setShowAddOption(false);
      setOptValue("");
      setOptLabel("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsPending(false);
    }
  };

  const handleArchive = async (optionId: string) => {
    if (!confirm("¿Archivar esta opción? No se podrán crear nuevas líneas con ella.")) return;
    setArchivingId(optionId);
    try {
      await archiveVariantOptionAction({ optionId });
      router.refresh();
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Editar label */}
      <div>
        {editingLabel ? (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 flex-1"
            />
            <button
              onClick={handleSaveLabel}
              disabled={isPending}
              className="px-3 py-2 text-sm font-medium bg-black text-white rounded-lg"
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setLabel(groupLabel);
                setEditingLabel(false);
              }}
              className="px-3 py-2 text-sm text-neutral-600"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <p className="text-lg">
            <span className="font-medium">{groupLabel}</span>
            <button
              onClick={() => setEditingLabel(true)}
              className="ml-2 text-sm text-neutral-500 hover:text-neutral-700"
            >
              Editar
            </button>
          </p>
        )}
      </div>

      {/* Toggle mostrar archivadas */}
      <div className="flex items-center gap-4">
        <Link
          href={
            includeArchived
              ? `/host/catalog/variant-groups/${groupId}`
              : `/host/catalog/variant-groups/${groupId}?showArchived=1`
          }
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          {includeArchived ? "Ocultar archivadas" : "Mostrar archivadas"}
        </Link>
      </div>

      {/* Opciones */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-neutral-700">Opciones</h3>
          <button
            type="button"
            onClick={() => setShowAddOption(true)}
            className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
          >
            + Agregar opción
          </button>
        </div>

        {options.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4">No hay opciones.</p>
        ) : (
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Label</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-500">valueNormalized</th>
                  <th className="text-left px-4 py-2 font-medium">sortOrder</th>
                  <th className="text-left px-4 py-2 font-medium">Estado</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {options.map((opt) => (
                  <tr key={opt.id} className="border-t border-neutral-100">
                    <td className="px-4 py-2">{opt.label}</td>
                    <td className="px-4 py-2 font-mono text-neutral-500">{opt.valueNormalized}</td>
                    <td className="px-4 py-2">{opt.sortOrder}</td>
                    <td className="px-4 py-2">{opt.isArchived ? "Archivada" : "Activa"}</td>
                    <td className="px-4 py-2">
                      {!opt.isArchived && (
                        <button
                          type="button"
                          onClick={() => handleArchive(opt.id)}
                          disabled={archivingId === opt.id}
                          className="text-red-600 text-xs hover:underline disabled:opacity-50"
                        >
                          Archivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Agregar opción */}
      {showAddOption && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !isPending && setShowAddOption(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-4">Agregar opción</h3>
            <form onSubmit={handleAddOption} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Value *</label>
                <input
                  type="text"
                  value={optValue}
                  onChange={(e) => setOptValue(e.target.value)}
                  placeholder="queen"
                  className="w-full rounded-lg border px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Label *</label>
                <input
                  type="text"
                  value={optLabel}
                  onChange={(e) => setOptLabel(e.target.value)}
                  placeholder="Queen"
                  className="w-full rounded-lg border px-3 py-2"
                  required
                />
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
                  {error}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => !isPending && setShowAddOption(false)}
                  className="px-3 py-2 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !optValue.trim() || !optLabel.trim()}
                  className="px-3 py-2 text-sm font-medium bg-black text-white rounded-lg disabled:opacity-50"
                >
                  {isPending ? "..." : "Agregar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
