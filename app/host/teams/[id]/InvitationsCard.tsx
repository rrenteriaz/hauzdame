"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CollapsibleSection from "@/lib/ui/CollapsibleSection";
import CreateInvitationSheet from "./CreateInvitationSheet";

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
  inviteLink: string;
}

interface InvitationsCardProps {
  teamId: string;
  invites: TeamInvite[];
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

export default function InvitationsCard({ teamId, invites }: InvitationsCardProps) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const getInviteLink = (invite: TeamInvite) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/join?token=${invite.token}`
      : invite.inviteLink;

  const handleCopyInviteLink = async (invite: TeamInvite) => {
    const linkToCopy = getInviteLink(invite);

    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopiedInviteId(invite.id);

      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => {
        setCopiedInviteId(null);
      }, 1400);
    } catch {
      // Silencioso (no bloquear UX). Si necesitas soporte legacy, aquí podríamos hacer fallback con <input>.select() + execCommand.
    }
  };

  const handleDelete = async (inviteId: string) => {
    if (!confirm("¿Eliminar esta invitación? Esta acción no se puede deshacer.")) return;

    try {
      const response = await fetch(`/api/teams/${teamId}/invites/${inviteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar la invitación");
      }

      // Refrescar página para actualizar lista
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error al eliminar la invitación");
    }
  };

  const handleInviteCreated = () => {
    setIsSheetOpen(false);
    router.refresh();
  };

  return (
    <>
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
        {/* Header con contador y botón */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-800">
            Invitaciones ({invites.length})
          </h2>
          <button
            type="button"
            onClick={() => setIsSheetOpen(true)}
            className="rounded-lg border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition active:scale-[0.98]"
          >
            Crear invitación
          </button>
        </div>

        {/* Acordeón para ver invitaciones existentes */}
        {invites.length > 0 && (
          <CollapsibleSection title="Ver invitaciones" defaultOpen={false}>
            <div className="pt-2">
              <ul className="space-y-2">
                {invites.map((invite) => {
                  const statusInfo = formatStatus(invite.status);

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
                                  value={getInviteLink(invite)}
                                  className="flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs text-neutral-900 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleCopyInviteLink(invite)}
                                  className={`rounded-lg border px-2 py-1 text-xs font-medium whitespace-nowrap transition-all duration-200 active:scale-[0.97] ${
                                    copiedInviteId === invite.id
                                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200 animate-pulse"
                                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                                  }`}
                                  aria-label={copiedInviteId === invite.id ? "Link copiado" : "Copiar link"}
                                >
                                  {copiedInviteId === invite.id ? (
                                    <span className="inline-flex items-center gap-1">
                                      <svg
                                        className="w-3.5 h-3.5"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        aria-hidden="true"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.25a1 1 0 0 1-1.42.002L3.3 9.168a1 1 0 1 1 1.4-1.43l3.087 3.03 6.5-6.48a1 1 0 0 1 1.417.002Z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      Copiado
                                    </span>
                                  ) : (
                                    "Copiar"
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {invite.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => handleDelete(invite.id)}
                            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 active:scale-[0.98] transition whitespace-nowrap"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CollapsibleSection>
        )}

        {/* Empty state */}
        {invites.length === 0 && (
          <p className="text-xs text-neutral-500 text-center py-4">
            Aún no has generado invitaciones para agregar miembros a tu equipo. Usa el botón "Crear invitación" para generar un link.
          </p>
        )}
      </section>

      {/* BottomSheet para crear invitación */}
      <CreateInvitationSheet
        teamId={teamId}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onInviteCreated={handleInviteCreated}
      />
    </>
  );
}

