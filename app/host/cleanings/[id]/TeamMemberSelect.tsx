"use client";

import { useState, useTransition, useEffect } from "react";
import { assignTeamMemberToCleaning } from "../actions";
import TeamMemberPickerSheet from "@/lib/ui/TeamMemberPickerSheet";

export default function TeamMemberSelect({
  teamMembers,
  defaultValue,
  cleaningId,
  returnTo,
}: {
  teamMembers: Array<{ id: string; name: string; team: { id: string; name: string } }>;
  defaultValue: string;
  cleaningId: string;
  returnTo: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedMemberId, setSelectedMemberId] = useState(defaultValue);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const hasAssignment = !!defaultValue;

  // Sincronizar con defaultValue cuando cambie (después de guardar)
  useEffect(() => {
    setSelectedMemberId(defaultValue);
    setIsEditing(false);
  }, [defaultValue]);

  const handleSelect = (memberId: string | "") => {
    setSelectedMemberId(memberId);
    setIsPickerOpen(false);
    setIsEditing(false);
    
    // Crear FormData y enviar
    // FASE 4.4.2: Parsear value "m:<membershipId>" o "t:<teamMemberId>"
    const formData = new FormData();
    formData.append("cleaningId", cleaningId);
    formData.append("returnTo", returnTo);
    
    if (!memberId) {
      // Sin asignación
      formData.append("assigneeType", "");
      formData.append("assignedMembershipId", "");
      formData.append("teamMemberId", "");
    } else if (memberId.startsWith("m:")) {
      // Membership: "m:<membershipId>"
      const membershipId = memberId.substring(2);
      formData.append("assigneeType", "MEMBERSHIP");
      formData.append("assignedMembershipId", membershipId);
      formData.append("teamMemberId", "");
    } else if (memberId.startsWith("t:")) {
      // Legacy: "t:<teamMemberId>"
      const teamMemberId = memberId.substring(2);
      formData.append("assigneeType", "TEAM_MEMBER");
      formData.append("assignedMembershipId", "");
      formData.append("teamMemberId", teamMemberId);
    } else {
      // Legacy sin prefijo (compatibilidad hacia atrás)
      formData.append("assigneeType", "");
      formData.append("assignedMembershipId", "");
      formData.append("teamMemberId", memberId);
    }
    
    startTransition(() => {
      assignTeamMemberToCleaning(formData);
    });
  };

  const handleModifyClick = () => {
    setIsEditing(true);
    setIsPickerOpen(true);
  };

  const handlePickerClose = () => {
    setIsPickerOpen(false);
    // Si se cerró sin seleccionar, cancelar edición
    if (selectedMemberId === defaultValue) {
      setIsEditing(false);
    }
  };

  return (
    <>
      {/* Versión móvil */}
      <div className="mt-3 sm:hidden">
        {hasAssignment && !isEditing ? (
          <button
            type="button"
            onClick={handleModifyClick}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base font-medium text-neutral-700 hover:bg-neutral-50 active:scale-[0.99] transition"
          >
            Modificar asignación
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            disabled={isPending}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base text-left outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
          >
            <span className={selectedMemberId ? "text-neutral-900" : "text-neutral-500"}>
              {selectedMemberId
                ? teamMembers.find((m) => m.id === selectedMemberId)?.name || "Sin asignar"
                : "Seleccionar miembro"}
            </span>
            <svg
              className="w-5 h-5 text-neutral-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Versión desktop */}
      <form action={assignTeamMemberToCleaning} className="mt-3 hidden sm:block space-y-2">
        <input type="hidden" name="cleaningId" value={cleaningId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <select
          name="teamMemberId"
          defaultValue={defaultValue}
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 bg-white"
        >
          <option value="">Sin asignar</option>
          {teamMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} ({member.team.name})
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base font-medium text-neutral-700 hover:bg-neutral-50 active:scale-[0.99] transition"
        >
          Guardar asignación
        </button>
      </form>

      {/* Bottom Sheet para móvil */}
      <TeamMemberPickerSheet
        isOpen={isPickerOpen}
        onClose={handlePickerClose}
        teamMembers={teamMembers}
        selectedMemberId={selectedMemberId}
        onSelect={handleSelect}
        title="Seleccionar miembro"
      />
    </>
  );
}
