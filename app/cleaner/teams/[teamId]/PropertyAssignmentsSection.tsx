"use client";

import { useMemo, useState } from "react";
import BottomSheet from "@/lib/ui/BottomSheet";
import { setAssignedMembersForProperty } from "../actions";

type TeamMember = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  isLeader: boolean;
};

type PropertyItem = {
  id: string;
  name: string;
  shortName: string | null;
  hostLabel: string;
  assignedMembershipIds: string[];
  defaultAssignedLeader?: boolean;
};

interface PropertyAssignmentsSectionProps {
  teamId: string;
  isTeamLeader: boolean;
  members: TeamMember[];
  properties: PropertyItem[];
}

export default function PropertyAssignmentsSection({
  teamId,
  isTeamLeader,
  members,
  properties,
}: PropertyAssignmentsSectionProps) {
  const leader = members.find((m) => m.isLeader) || null;
  const smMembers = members.filter((m) => !m.isLeader);

  const [assignments, setAssignments] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {};
    for (const p of properties) {
      const set = new Set(p.assignedMembershipIds);
      if (leader?.membershipId) set.add(leader.membershipId);
      initial[p.id] = set;
    }
    return initial;
  });
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openEditor = (property: PropertyItem) => {
    const current = assignments[property.id] || new Set<string>();
    const onlySm = new Set(
      Array.from(current).filter((id) => smMembers.some((m) => m.membershipId === id))
    );
    setSelectedIds(onlySm);
    setEditingProperty(property);
    setError(null);
  };

  const handleToggleMember = (membershipId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(membershipId)) {
        next.delete(membershipId);
      } else {
        next.add(membershipId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!editingProperty) return;
    setError(null);
    setIsSaving(true);

    const propertyId = editingProperty.id;
    const prev = assignments[propertyId] || new Set<string>();
    const next = new Set(selectedIds);
    if (leader?.membershipId) next.add(leader.membershipId);

    setAssignments((cur) => ({
      ...cur,
      [propertyId]: next,
    }));

    const formData = new FormData();
    formData.append("teamId", teamId);
    formData.append("propertyId", propertyId);
    formData.append("selectedMembershipIds", JSON.stringify(Array.from(selectedIds)));

    try {
      const result = await setAssignedMembersForProperty(formData);
      const resultSet = new Set<string>(result.assignedMembershipIds as string[]);
      setAssignments((cur) => {
        const next: Record<string, Set<string>> = { ...cur };
        next[propertyId] = resultSet;
        return next;
      });
      setEditingProperty(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo guardar.";
      setAssignments((cur) => {
        const next: Record<string, Set<string>> = { ...cur };
        next[propertyId] = prev;
        return next;
      });
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const assignedMembersFor = (propertyId: string) => {
    const ids = assignments[propertyId] || new Set<string>();
    return members.filter((m) => ids.has(m.membershipId) || m.isLeader);
  };

  return (
    <>
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
        <h2 className="text-base font-semibold text-neutral-800">Propiedades</h2>
        {properties.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Este equipo aún no tiene propiedades asignadas
          </p>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => {
              const assigned = assignedMembersFor(property.id);
              return (
                <div
                  key={property.id}
                  role={isTeamLeader ? "button" : undefined}
                  tabIndex={isTeamLeader ? 0 : -1}
                  onClick={() => isTeamLeader && openEditor(property)}
                  onKeyDown={(e) => {
                    if (!isTeamLeader) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openEditor(property);
                    }
                  }}
                  className={`space-y-2 rounded-lg p-2 -mx-2 ${
                    isTeamLeader ? "cursor-pointer hover:bg-neutral-50" : ""
                  }`}
                  aria-label={
                    isTeamLeader
                      ? `Editar miembros asignados de ${property.shortName || property.name}`
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-900">
                      {property.shortName || property.name}
                    </p>
                    <span className="text-xs text-neutral-500">
                      Host: {property.hostLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {assigned.length === 0 ? (
                      <span className="text-xs text-neutral-500">
                        Sin miembros asignados
                      </span>
                    ) : (
                      <>
                        {assigned.slice(0, 3).map((m) => {
                          const initial = (m.name || m.email).trim()[0]?.toUpperCase() || "M";
                          return (
                            <div
                              key={`${property.id}-${m.membershipId}`}
                              className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                                m.isLeader
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                              title={`${m.name || m.email}${m.isLeader ? " (Líder)" : ""}${property.defaultAssignedLeader && m.isLeader ? " - Por defecto" : ""}`}
                            >
                              {initial}
                            </div>
                          );
                        })}
                        {assigned.length > 3 && (
                          <span className="text-xs text-neutral-500">
                            +{assigned.length - 3}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <BottomSheet
        isOpen={!!editingProperty}
        onClose={() => {
          if (isSaving) return;
          setEditingProperty(null);
          setError(null);
        }}
        title={`Miembros asignados${editingProperty?.shortName ? `. (${editingProperty.shortName})` : ""}`}
        subtitle="Miembros que pueden ver las limpiezas"
        maxHeight="85vh"
      >
        {editingProperty && (
          <div className="px-6 pb-6 space-y-4">
            {/* Miembros */}
            <div className="space-y-2">
              <div className="h-2" />
              {smMembers.length === 0 ? (
                <p className="text-sm text-neutral-500">No hay miembros para asignar</p>
              ) : (
                <div className="space-y-2">
                  {smMembers.map((member) => {
                    const checked = selectedIds.has(member.membershipId);
                    return (
                      <label key={member.membershipId} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleMember(member.membershipId)}
                        />
                        <span className="text-base text-neutral-900">
                          {member.name || member.email}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer sticky */}
        <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-4 flex gap-2">
          <button
            type="button"
            onClick={() => setEditingProperty(null)}
            disabled={isSaving}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-lg border border-black bg-black px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

