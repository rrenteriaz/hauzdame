// app/host/workgroups/[id]/ExecutorsSection.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { WorkGroupExecutorRef } from "@/lib/workgroups/resolveWorkGroupsForProperty";
import AddExecutorModal from "./AddExecutorModal";
import { getTeamDisplayNameForHost } from "@/lib/host/teamDisplayName";

interface ExecutorsSectionProps {
  workGroupId: string;
  executors: WorkGroupExecutorRef[];
  executorTeamsById: Record<string, { id: string; name: string; tenantId: string }>;
  executorLeaderByTeamId: Record<string, { name: string | null; email: string | null }>;
  executorMembersCountByTeamId: Record<string, number>;
  canEdit: boolean;
  returnTo: string;
}

export default function ExecutorsSection({
  workGroupId,
  executors,
  executorTeamsById,
  executorLeaderByTeamId,
  executorMembersCountByTeamId,
  canEdit,
  returnTo,
}: ExecutorsSectionProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const existingExecutorTeamIds = executors.map((e) => e.teamId);

  return (
    <>
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-800">
            Cleaners en tu grupo ({executors.length})
          </h2>
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs text-neutral-600 hover:text-neutral-900 underline underline-offset-2"
            >
              Conectar equipo ejecutor
            </button>
          )}
        </div>

        {executors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-center">
            <p className="text-xs text-neutral-500 mb-2">
              No hay equipos ejecutores conectados a este grupo de trabajo.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs text-neutral-900 underline underline-offset-2 mt-2"
              >
                Conectar equipo ejecutor
              </button>
            )}
            {!canEdit && (
              <p className="text-xs text-neutral-400">
                Los equipos ejecutores se conectan desde el dominio Services.
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {executors.map((executor) => {
              const team = executorTeamsById[executor.teamId];
              const leader = executorLeaderByTeamId[executor.teamId];
              const membersCount = executorMembersCountByTeamId[executor.teamId] ?? 0;
              const displayName = getTeamDisplayNameForHost({
                teamName: team?.name ?? `Equipo ${executor.teamId.slice(0, 8)}`,
                leaderUser: leader ?? null,
              });
              
              // Siempre regresar a la página de detalle del grupo de trabajo, no al returnTo original
              const workGroupDetailUrl = `/host/workgroups/${workGroupId}`;
              const teamDetailHref = `/host/workgroups/${workGroupId}/teams/${executor.teamId}?returnTo=${encodeURIComponent(workGroupDetailUrl)}`;
              
              return (
                <li
                  key={`${executor.workGroupId}-${executor.teamId}`}
                  className="rounded-xl border border-neutral-200 p-3"
                >
                  <Link
                    href={teamDetailHref}
                    className="flex items-start justify-between gap-2 hover:bg-neutral-50 -m-3 p-3 rounded-xl transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium text-neutral-900">
                        {displayName}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Miembros: {membersCount}
                      </p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                      executor.status === "ACTIVE" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-neutral-100 text-neutral-600"
                    }`}>
                      {executor.status === "ACTIVE" ? "Activo" : "Inactivo"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canEdit && (
        <AddExecutorModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          workGroupId={workGroupId}
          existingExecutorTeamIds={existingExecutorTeamIds}
          returnTo={returnTo}
        />
      )}
    </>
  );
}

