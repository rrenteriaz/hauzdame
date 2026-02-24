"use client";

import { useState, useEffect, useCallback } from "react";

interface TeamInvite {
  id: string;
  token: string;
  status: "PENDING" | "CLAIMED" | "EXPIRED" | "REVOKED";
  prefillName: string | null;
  message: string | null;
  createdAt: string;
  expiresAt: string;
  claimedAt: string | null;
  claimedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface TeamInvitesListProps {
  teamId: string;
}

function formatStatus(status: TeamInvite["status"]): { label: string; className: string } {
  switch (status) {
    case "PENDING":
      return { label: "Pendiente", className: "bg-amber-100 text-amber-800" };
    case "CLAIMED":
      return { label: "Reclamado", className: "bg-green-100 text-green-800" };
    case "EXPIRED":
      return { label: "Expirado", className: "bg-neutral-100 text-neutral-600" };
    case "REVOKED":
      return { label: "Revocado", className: "bg-red-100 text-red-800" };
    default:
      return { label: status, className: "bg-neutral-100 text-neutral-600" };
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TeamInvitesList({ teamId }: TeamInvitesListProps) {
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/teams/${teamId}/invites`);
      if (!response.ok) {
        throw new Error("Error al cargar invitaciones");
      }
      const data = await response.json();
      setInvites(data.invites || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar invitaciones");
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleRevoke = async (inviteId: string) => {
    if (!confirm("¿Revocar esta invitación?")) return;

    try {
      const response = await fetch(`/api/teams/${teamId}/invites/${inviteId}/revoke`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Error al revocar la invitación");
      }

      // Recargar lista
      await fetchInvites();
    } catch (err: any) {
      alert(err.message || "Error al revocar la invitación");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-neutral-500 text-center py-4">
          Cargando...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {invites.length === 0 ? (
        <p className="text-xs text-neutral-500 text-center py-4">
          No hay invitaciones generadas.
        </p>
      ) : (
        <ul className="space-y-2">
          {invites.map((invite) => {
            const statusInfo = formatStatus(invite.status);
            const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/join?token=${invite.token}`;

            return (
              <li
                key={invite.id}
                className="rounded-xl border border-neutral-200 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                      {invite.prefillName && (
                        <span className="text-sm font-medium text-neutral-900">
                          {invite.prefillName}
                        </span>
                      )}
                    </div>

                    {invite.message && (
                      <p className="text-xs text-neutral-600 mt-1">
                        {invite.message}
                      </p>
                    )}

                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-neutral-500">
                        Creado: {formatDate(invite.createdAt)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Expira: {formatDate(invite.expiresAt)}
                      </p>
                      {invite.claimedAt && (
                        <p className="text-xs text-green-700">
                          Reclamado: {formatDate(invite.claimedAt)}
                          {invite.claimedBy && (
                            <span className="ml-1">
                              por {invite.claimedBy.name || invite.claimedBy.email}
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {invite.status === "PENDING" && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={inviteLink}
                            className="flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs text-neutral-900 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(inviteLink).catch(() => {});
                            }}
                            className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 active:scale-[0.98] transition whitespace-nowrap"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {invite.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(invite.id)}
                      className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 active:scale-[0.98] transition whitespace-nowrap"
                    >
                      Revocar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

