// components/chat/ManageThreadMembers.tsx
"use client";

import { useState, useEffect } from "react";

interface TeamMember {
  id: string;
  name: string | null;
  avatarMedia: {
    id: string;
    publicUrl: string | null;
  } | null;
  isParticipant: boolean;
}

interface ManageThreadMembersProps {
  threadId: string;
  threadType: "HOST_CLEANER" | "HOST_TEAM" | "TEAM_INTERNAL" | "HOST_HOST";
  viewerParticipantRole: "OWNER" | "ADMIN" | "MEMBER";
}

export function ManageThreadMembers({
  threadId,
  threadType,
  viewerParticipantRole,
}: ManageThreadMembersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo mostrar si es HOST_TEAM y el viewer es OWNER
  const canManage = threadType === "HOST_TEAM" && viewerParticipantRole === "OWNER";

  useEffect(() => {
    if (isOpen && canManage) {
      loadTeamMembers();
    }
  }, [isOpen, threadId, canManage]);

  const loadTeamMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/threads/${threadId}/team-members`);
      if (!res.ok) {
        throw new Error("Failed to load team members");
      }
      const data = await res.json();
      setTeamMembers((data.members || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        avatarMedia: m.avatarMedia || null,
        isParticipant: m.isParticipant || false,
      })));
    } catch (err: any) {
      setError(err.message || "Error loading team members");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/chat/threads/${threadId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        throw new Error("Failed to add member");
      }
      // Refresh team members list
      await loadTeamMembers();
    } catch (err: any) {
      setError(err.message || "Error adding member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/chat/threads/${threadId}/participants/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to remove member");
      }
      // Refresh team members list
      await loadTeamMembers();
    } catch (err: any) {
      setError(err.message || "Error removing member");
    }
  };

  if (!canManage) {
    return null;
  }

  return (
    <>
      {/* Botón "Administrar miembros" */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors shrink-0"
        title="Administrar miembros"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-900">
                Administrar miembros
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5"
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading && (
                <div className="text-center py-8 text-neutral-500">
                  Cargando miembros...
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && teamMembers.length === 0 && (
                <div className="text-center py-8 text-neutral-500">
                  No hay miembros disponibles
                </div>
              )}

              {!loading && !error && teamMembers.length > 0 && (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {member.avatarMedia?.publicUrl ? (
                          <img
                            src={member.avatarMedia.publicUrl}
                            alt={member.name || "Usuario"}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-neutral-300 flex items-center justify-center text-neutral-600 font-medium shrink-0">
                            {(member.name || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {member.name || "Usuario"}
                          </p>
                        </div>
                        {member.isParticipant && (
                          <span className="text-xs text-neutral-500 bg-neutral-200 px-2 py-1 rounded shrink-0">
                            En chat
                          </span>
                        )}
                      </div>
                      <div className="ml-3 shrink-0">
                        {member.isParticipant ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id)}
                            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Remover
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddMember(member.id)}
                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

