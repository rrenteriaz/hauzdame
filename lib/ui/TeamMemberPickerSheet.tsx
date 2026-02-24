"use client";

import { useEffect, useRef, useState } from "react";
import BottomSheet from "./BottomSheet";

interface TeamMember {
  id: string;
  name: string;
  team: {
    id: string;
    name: string;
  };
}

interface TeamMemberPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  selectedMemberId: string | "";
  onSelect: (memberId: string | "") => void;
  title?: string;
  showUnassignOption?: boolean; // Mostrar opción "Sin asignar"
}

export default function TeamMemberPickerSheet({
  isOpen,
  onClose,
  teamMembers,
  selectedMemberId,
  onSelect,
  title = "Seleccionar miembro",
  showUnassignOption = false,
}: TeamMemberPickerSheetProps) {
  // Ordenar miembros por equipo y luego por nombre
  const sortedMembers = teamMembers
    .slice()
    .sort((a, b) => {
      const teamCompare = a.team.name.localeCompare(b.team.name, "es");
      if (teamCompare !== 0) return teamCompare;
      return a.name.localeCompare(b.name, "es");
    });

  const handleSelect = (memberId: string | "") => {
    onSelect(memberId);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} maxHeight="80vh">
      <div className="px-6 py-4">
        {/* Opción "Sin asignar" (solo si showUnassignOption es true) */}
        {showUnassignOption && (
          <button
            type="button"
            onClick={() => handleSelect("")}
            className={`w-full px-4 py-3 text-left rounded-lg transition flex items-center justify-between ${
              !selectedMemberId
                ? "bg-neutral-100 font-medium text-neutral-900"
                : "text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <span>Sin asignar</span>
            {!selectedMemberId && (
              <svg
                className="w-5 h-5 text-neutral-600 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        )}

        {/* Lista de miembros agrupados por equipo */}
        <div className="mt-2 space-y-1">
          {sortedMembers.map((member) => {
            const isSelected = selectedMemberId === member.id;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => handleSelect(member.id)}
                className={`w-full px-4 py-3 text-left rounded-lg transition flex items-center justify-between ${
                  isSelected
                    ? "bg-neutral-100 font-medium text-neutral-900"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-neutral-900 truncate">
                    {member.name}
                  </p>
                  <p className="text-sm text-neutral-600 truncate">
                    {member.team.name}
                  </p>
                </div>
                {isSelected && (
                  <svg
                    className="w-5 h-5 text-neutral-600 shrink-0 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
}

