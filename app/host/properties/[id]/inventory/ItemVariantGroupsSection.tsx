"use client";

import { useState, useEffect } from "react";
import {
  listItemVariantGroupsAction,
  listTenantVariantGroupsAction,
  attachVariantGroupToItemAction,
  detachVariantGroupFromItemAction,
} from "@/app/host/catalog/variant-groups/actions";

interface ItemVariantGroupsSectionProps {
  itemId: string;
  onUpdate?: () => void;
}

interface LinkedGroup {
  id: string;
  group: { id: string; key: string; label: string };
}

interface TenantGroup {
  id: string;
  key: string;
  label: string;
  itemCount: number;
}

export default function ItemVariantGroupsSection({
  itemId,
  onUpdate,
}: ItemVariantGroupsSectionProps) {
  const [linkedGroups, setLinkedGroups] = useState<LinkedGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<TenantGroup[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLinked = async () => {
    const links = await listItemVariantGroupsAction(itemId);
    setLinkedGroups(
      links.map((l) => ({
        id: l.id,
        group: l.group,
      }))
    );
  };

  const loadAvailable = async () => {
    const groups = await listTenantVariantGroupsAction();
    setAvailableGroups(groups);
  };

  useEffect(() => {
    loadLinked();
  }, [itemId]);

  useEffect(() => {
    if (showAddModal) loadAvailable();
  }, [showAddModal]);

  const handleAttach = async (groupId: string) => {
    setError(null);
    setIsPending(true);
    try {
      await attachVariantGroupToItemAction({ itemId, groupId });
      await loadLinked();
      setShowAddModal(false);
      setSearch("");
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsPending(false);
    }
  };

  const handleDetach = async (groupId: string) => {
    if (!confirm("¿Desasociar este grupo del ítem?")) return;
    setError(null);
    setIsPending(true);
    try {
      await detachVariantGroupFromItemAction({ itemId, groupId });
      await loadLinked();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsPending(false);
    }
  };

  const linkedIds = new Set(linkedGroups.map((l) => l.group.id));
  const filteredAvailable = availableGroups.filter(
    (g) =>
      !linkedIds.has(g.id) &&
      (search === "" ||
        g.label.toLowerCase().includes(search.toLowerCase()) ||
        g.key.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-neutral-700">
        Grupos de variantes (Tenant)
      </h4>
      {linkedGroups.length > 0 ? (
        <ul className="space-y-1">
          {linkedGroups.map((link) => (
            <li
              key={link.id}
              className="flex justify-between items-center rounded-lg border border-neutral-200 px-3 py-2 bg-white"
            >
              <span>
                {link.group.label}
                <span className="text-neutral-500 text-sm ml-1">
                  ({link.group.key})
                </span>
              </span>
              <button
                type="button"
                onClick={() => handleDetach(link.group.id)}
                disabled={isPending}
                className="text-sm text-red-600 hover:underline disabled:opacity-50"
              >
                Desasociar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">Ningún grupo asociado.</p>
      )}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
      >
        + Agregar grupo existente
      </button>

      {showAddModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={() => {
            if (isPending) return;
            setShowAddModal(false);
            setError(null);
            setSearch("");
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-3">
              Agregar grupo existente
            </h3>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o key..."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 mb-3"
            />
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mb-3 text-sm text-red-800">
                {error}
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-1 mb-4">
              {filteredAvailable.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  {search
                    ? "No hay grupos que coincidan."
                    : "No hay grupos disponibles para asociar."}
                </p>
              ) : (
                filteredAvailable.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleAttach(g.id)}
                    disabled={isPending}
                    className="w-full text-left rounded-lg border border-neutral-200 px-3 py-2 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {g.label} <span className="text-neutral-500">({g.key})</span>
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => {
            if (isPending) return;
            setShowAddModal(false);
            setError(null);
            setSearch("");
          }}
              className="px-3 py-2 text-sm font-medium text-neutral-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
