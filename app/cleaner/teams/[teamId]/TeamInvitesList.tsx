"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type InviteStatus = "PENDING" | "CLAIMED" | "EXPIRED" | "REVOKED";

export type TeamInviteItem = {
  id: string;
  token: string;
  status: InviteStatus;
  prefillName: string | null;
  createdAt: string;
  expiresAt: string;
  claimedAt: string | null;
  inviteLink: string;
};

function formatStatus(status: InviteStatus): { label: string; className: string } {
  switch (status) {
    case "PENDING":
      return { label: "Pendiente", className: "bg-amber-100 text-amber-800" };
    case "CLAIMED":
      return { label: "Aceptada", className: "bg-emerald-100 text-emerald-800" };
    case "EXPIRED":
      return { label: "Expirada", className: "bg-neutral-100 text-neutral-600" };
    case "REVOKED":
      return { label: "Revocada", className: "bg-red-100 text-red-800" };
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
  });
}

function formatExpiryHint(dateString: string): string {
  const expiresAt = new Date(dateString);
  const now = new Date();
  const ms = expiresAt.getTime() - now.getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (Number.isNaN(days)) return "Expira";
  if (days <= 0) return "Expirada";
  if (days === 1) return "Expira en 1 día";
  return `Expira en ${days} días`;
}

export default function TeamInvitesList({
  teamId,
  invites,
}: {
  teamId: string;
  invites: TeamInviteItem[];
}) {
  const router = useRouter();
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `teamInvitesCollapsed:${teamId}`;

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "false") {
        setCollapsed(false);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, next ? "true" : "false");
      } catch {
        // ignore
      }
      return next;
    });
  };

  const getInviteLink = (invite: TeamInviteItem) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/join?token=${invite.token}`
      : invite.inviteLink;

  const handleCopyInviteLink = async (invite: TeamInviteItem) => {
    const linkToCopy = getInviteLink(invite);
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopiedInviteId(invite.id);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => {
        setCopiedInviteId(null);
      }, 1200);
    } catch {
      // Silencioso
    }
  };

  const visibleInvites = invites.filter((i) => i.status !== "REVOKED");
  const pendingCount = visibleInvites.filter((i) => i.status === "PENDING").length;

  const handleRevoke = async (inviteId: string) => {
    if (!confirm("¿Revocar este enlace? La persona ya no podrá usarlo.")) return;
    try {
      const response = await fetch(`/api/teams/${teamId}/invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo revocar la invitación");
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message || "No se pudo revocar la invitación");
    }
  };

  const handleDelete = async (inviteId: string) => {
    if (
      !confirm(
        "¿Eliminar esta invitación? Ya fue usada y se removerá del historial del team."
      )
    )
      return;
    try {
      const response = await fetch(`/api/teams/${teamId}/invites/${inviteId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo eliminar la invitación");
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message || "No se pudo eliminar la invitación");
    }
  };

  if (visibleInvites.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Aún no has generado invitaciones para este equipo.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100"
      >
        <span className="font-medium">Invitaciones</span>
        <span className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 font-medium">
            {pendingCount} pendientes
          </span>
          <svg
            className={`h-4 w-4 transition-transform ${collapsed ? "rotate-0" : "rotate-180"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {!collapsed && (
        <div className="space-y-2">
          {visibleInvites.map((invite) => {
            const statusInfo = formatStatus(invite.status);
            const inviteeLabel = invite.prefillName || "(sin nombre)";
            return (
              <div key={invite.id} className="rounded-xl border border-neutral-200 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {formatExpiryHint(invite.expiresAt)}
                    </span>
                  </div>
                  {(invite.status === "PENDING" || invite.status === "EXPIRED") && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(invite.id)}
                      className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Revocar enlace
                    </button>
                  )}
                </div>

                <div className="text-xs text-neutral-500">
                  Invitado: {inviteeLabel}
                </div>

                <div className="text-xs text-neutral-500">
                  Creada: {formatDate(invite.createdAt)} · Expira: {formatDate(invite.expiresAt)}
                </div>

                {invite.status === "PENDING" && (
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
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      {copiedInviteId === invite.id ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                )}

                {invite.status === "CLAIMED" && invite.claimedAt && (
                  <div className="text-xs text-emerald-700">
                    Aceptada: {formatDate(invite.claimedAt)}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {invite.status === "CLAIMED" && (
                    <button
                      type="button"
                      onClick={() => handleDelete(invite.id)}
                      className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Eliminar invitación
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

