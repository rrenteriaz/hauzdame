"use client";

import { useState } from "react";
import type { CleaningAssignmentLevel } from "@/lib/cleanings/getCleaningAssignmentLevel";

/**
 * Determina la variante visual de la tarjeta de asignación basada en el nivel de asignación.
 * Niveles 0, 1, 2 requieren atención suave (amber).
 */
function getAssignmentCardVariant(assignmentLevel: CleaningAssignmentLevel): "attention" | "default" {
  return assignmentLevel <= 2 ? "attention" : "default";
}

interface Assignee {
  id: string;
  member: {
    id: string;
    name: string;
    team: {
      id: string;
      name: string;
    };
  };
  assignedAt: Date;
}

interface AssignmentSectionProps {
  assignees: Assignee[];
  teamMembers: Array<{ id: string; name: string; team: { id: string; name: string } }>;
  propertyTeams: Array<{ teamId: string; team: { id: string; name: string } }>;
  hasError?: boolean;
  primaryAssigneeId?: string | null; // assignedMemberId del cleaning (primary)
  cleaningStatus?: string; // Status de la limpieza (PENDING, IN_PROGRESS, etc.)
  assignmentLevel: CleaningAssignmentLevel; // Nivel de asignación canónico
  teamId: string | null; // ID del Team asignado (si existe)
  teamName: string | null; // Nombre del Team asignado (si existe)
}

export default function AssignmentSection({
  assignees,
  teamMembers,
  propertyTeams,
  hasError = false,
  primaryAssigneeId = null,
  cleaningStatus = "PENDING",
  assignmentLevel,
  teamId,
  teamName,
}: AssignmentSectionProps) {
  const [isTeamsOpen, setIsTeamsOpen] = useState(false);
  // Verificar si la limpieza está iniciada
  const isInProgress = cleaningStatus === "IN_PROGRESS";
  const isCompleted = cleaningStatus === "COMPLETED";
  
  // Si hay 1 solo miembro y está auto-asignado, no mostrar botones de cambio
  const hasSingleMember = teamMembers.length === 1;
  const isAutoAssigned = hasSingleMember && primaryAssigneeId !== null;
  const primaryAssignee = assignees.find((a) => a.member.id === primaryAssigneeId) || assignees[0];
  const hasAssignee = assignees.length > 0 || primaryAssigneeId !== null;
  const variant = getAssignmentCardVariant(assignmentLevel);
  const isAttention = variant === "attention";

  return (
    <>
      <section
        className={`rounded-2xl border p-4 space-y-3 ${
          isAttention
            ? "border-amber-200 bg-amber-50"
            : "border-neutral-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className={`text-base font-semibold ${isAttention ? "text-amber-900" : "text-neutral-900"}`}>
            {isAttention && <span className="mr-1.5">⚠️</span>}
            Asignación
          </p>
          {/* Mostrar botón "Ver equipos" solo si hay equipos disponibles (Nivel 1+) */}
          {propertyTeams.length > 0 && assignmentLevel !== 0 && (
            <button
              type="button"
              onClick={() => setIsTeamsOpen(true)}
              className="text-sm text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
            >
              Ver equipos
            </button>
          )}
        </div>

        {hasError ? (
          <div className="py-2">
            <p className="text-sm text-neutral-500">No se pudo cargar la asignación.</p>
          </div>
        ) : assignmentLevel === 0 ? (
          // Nivel 0: Sin contexto ejecutor
          <div className="py-2 space-y-2">
            <p className={`text-sm ${isAttention ? "text-amber-900" : "text-neutral-700"}`}>
              Sin equipo disponible
            </p>
            <p className={`text-xs ${isAttention ? "text-amber-700" : "text-neutral-500"}`}>
              Esta propiedad no tiene equipos configurados. Ve a la propiedad para configurar equipos.
            </p>
          </div>
        ) : assignmentLevel === 1 ? (
          // Nivel 1: Con contexto disponible pero sin asignar
          <div className="py-2 space-y-2">
            <p className={`text-sm ${isAttention ? "text-amber-900" : "text-neutral-700"}`}>
              Pendiente de aceptación
            </p>
            <p className={`text-xs ${isAttention ? "text-amber-700" : "text-neutral-500"}`}>
              Hay equipos asignados a esta propiedad, pero ningún miembro ha aceptado la limpieza.
            </p>
          </div>
        ) : assignmentLevel === 2 ? (
          // Nivel 2: Asignada a Team
          <div className="py-2 space-y-2">
            <p className={`text-sm font-medium ${isAttention ? "text-amber-900" : "text-neutral-900"}`}>
              Asignada a equipo: {teamName || "Equipo"}
            </p>
            <p className={`text-xs ${isAttention ? "text-amber-700" : "text-neutral-500"}`}>
              La limpieza está asignada al equipo. Los cleaners del equipo pueden ver y aceptar la limpieza.
            </p>
          </div>
        ) : assignmentLevel === 3 ? (
          // Nivel 3: Aceptada por Cleaner
          <div className="py-2 space-y-2">
            <p className="text-sm font-medium text-neutral-900">
              {primaryAssignee?.member.name || "Cleaner asignado"}
            </p>
            <p className="text-xs text-neutral-600">
              {primaryAssignee?.member.team.name || "Equipo"}
            </p>
            <p className="text-xs text-neutral-500">
              {isInProgress ? "En progreso" : isCompleted ? "Completada" : "Pendiente"}
            </p>
          </div>
        ) : assignmentLevel === 4 ? (
          // Nivel 4: En ejecución
          <div className="py-2 space-y-2">
            <p className="text-sm font-medium text-neutral-900">
              En ejecución por: {primaryAssignee?.member.name || "Cleaner asignado"}
            </p>
            <p className="text-xs text-neutral-600">
              {primaryAssignee?.member.team.name || "Equipo"}
            </p>
            <p className="text-xs text-neutral-500">En progreso</p>
          </div>
        ) : assignmentLevel === 5 ? (
          // Nivel 5: Completada
          <div className="py-2 space-y-2">
            <p className="text-sm font-medium text-neutral-900">
              Completada por: {primaryAssignee?.member.name || "Cleaner asignado"}
            </p>
            <p className="text-xs text-neutral-600">
              {primaryAssignee?.member.team.name || "Equipo"}
            </p>
            <p className="text-xs text-neutral-500">Completada</p>
          </div>
        ) : (
          // Fallback (no debería ocurrir)
          <div className="py-2 space-y-2">
            <p className="text-sm text-neutral-500">Estado de asignación desconocido</p>
          </div>
        )}
      </section>

      {isTeamsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsTeamsOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Equipos asignados a la propiedad
              </h2>
            </div>
            <div className="space-y-4">
              {propertyTeams.map((propertyTeam) => {
                const members = teamMembers.filter((m) => m.team.id === propertyTeam.teamId);
                return (
                  <div key={propertyTeam.team?.id || propertyTeam.teamId} className="space-y-1">
                    <p className="text-sm font-medium text-neutral-800">
                      Equipo: {propertyTeam.team?.name || "Equipo"} ({members.length} miembros)
                    </p>
                    <p className="text-sm text-neutral-700">
                      {members.length > 0 ? members.map((m) => m.name).join(" · ") : "Sin miembros"}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsTeamsOpen(false)}
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

