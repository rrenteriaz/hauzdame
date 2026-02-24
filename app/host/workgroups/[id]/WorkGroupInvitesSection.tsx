// app/host/workgroups/[id]/WorkGroupInvitesSection.tsx
// Refactorizado para usar el mismo patrón visual que TeamInvitesList (TL→SM)
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { revokeInvite } from "../invites/actions";
import StopPropagationDiv from "@/lib/ui/StopPropagationDiv";

type InviteStatus = "PENDING" | "CLAIMED" | "EXPIRED" | "REVOKED";

interface Invite {
  id: string;
  token: string;
  status: InviteStatus;
  prefillName: string | null;
  createdAt: Date | string;
  expiresAt: Date | string;
  claimedAt: Date | string | null;
  createdByUser: {
    name: string | null;
  };
  claimedByUser?: {
    name: string | null;
    email: string;
  } | null;
}

interface WorkGroupInvitesSectionProps {
  workGroupId: string;
  workGroupName: string;
  invites: Invite[];
  returnTo: string;
}

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

function formatDate(dateString: Date | string): string {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatExpiryHint(dateString: Date | string): string {
  const expiresAt = typeof dateString === "string" ? new Date(dateString) : dateString;
  const now = new Date();
  const ms = expiresAt.getTime() - now.getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (Number.isNaN(days)) return "Expira";
  if (days <= 0) return "Expirada";
  if (days === 1) return "Expira en 1 día";
  return `Expira en ${days} días`;
}

export default function WorkGroupInvitesSection({
  workGroupId,
  workGroupName,
  invites,
  returnTo,
}: WorkGroupInvitesSectionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [prefillName, setPrefillName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `workGroupInvitesCollapsed:${workGroupId}`;

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

  const getInviteLink = (token: string) => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/join/host?token=${token}`;
  };

  const handleCopyInviteLink = async (invite: Invite) => {
    const linkToCopy = getInviteLink(invite.token);
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

  const handleCreateInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    setGeneratedLink(null);

    try {
      const trimmedPrefill = prefillName.trim();
      const payload = {
        prefillName: trimmedPrefill || null,
        expiresInDays,
      };
      const response = await fetch(`/api/host-workgroups/${workGroupId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Error al generar el link de invitación");
      }

      const data: { invite: { token: string }; inviteLink: string } = await response.json();

      // Usar origin del cliente para evitar 0.0.0.0
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setGeneratedLink(data.inviteLink || `${origin}/join/host?token=${data.invite.token}`);
      router.refresh(); // Refrescar para mostrar la nueva invitación en la lista
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al generar el link de invitación";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = generatedLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  const handleClose = () => {
    setGeneratedLink(null);
    setPrefillName("");
    setExpiresInDays(7);
    setError(null);
    setIsOpen(false);
  };

  const handleRevoke = async (inviteId: string) => {
    if (!confirm("¿Revocar este enlace? La persona ya no podrá usarlo.")) return;
    try {
      const formData = new FormData();
      formData.set("inviteId", inviteId);
      formData.set("workGroupId", workGroupId);
      formData.set("returnTo", returnTo);
      await revokeInvite(formData);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "No se pudo revocar la invitación");
    }
  };

  const visibleInvites = invites.filter((i) => i.status !== "REVOKED");
  const pendingCount = visibleInvites.filter((i) => i.status === "PENDING").length;

  if (invites.length === 0) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-800">Invita a un Cleaner a tu grupo de trabajo</h2>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-lg border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition active:scale-[0.98]"
          >
            Crear invitación
          </button>
        </div>

        <p className="text-sm text-neutral-500">
          Aún no has generado invitaciones para este grupo de trabajo.
        </p>

        {/* Modal para crear invitación */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
              <h3 className="text-lg font-semibold text-neutral-900">Invitar Team Leader</h3>
              <p className="text-sm text-neutral-600">
                Genera un link de invitación para conectar un Team Leader (Cleaner) a este grupo de trabajo.
              </p>

              {generatedLink ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                    <label className="block text-sm font-medium text-neutral-700">
                      Link de invitación para "{workGroupName}"
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedLink}
                        className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:scale-[0.98] transition whitespace-nowrap"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99]"
                  >
                    Listo
                  </button>
                </div>
              ) : (
                <form ref={formRef} onSubmit={handleCreateInvite} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="prefillName" className="block text-sm font-medium text-neutral-800">
                      Nombre (opcional)
                    </label>
                    <input
                      type="text"
                      id="prefillName"
                      name="prefillName"
                      value={prefillName}
                      onChange={(e) => setPrefillName(e.target.value)}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                      placeholder="Nombre del Team Leader"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="expiresInDays" className="block text-sm font-medium text-neutral-800">
                      Expira en (días)
                    </label>
                    <input
                      type="number"
                      id="expiresInDays"
                      name="expiresInDays"
                      min={1}
                      max={30}
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(Number.parseInt(e.target.value) || 7)}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Generando..." : "Generar link"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-800">Invita a un Cleaner a tu grupo de trabajo</h2>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-lg border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition active:scale-[0.98]"
        >
          Crear invitación
        </button>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100"
        >
          <span className="font-medium">Ver invitaciones</span>
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
              const now = new Date();
              const expiresAt = typeof invite.expiresAt === "string" ? new Date(invite.expiresAt) : invite.expiresAt;
              const isExpired = expiresAt < now;
              const effectiveStatus = invite.status === "PENDING" && isExpired ? "EXPIRED" : invite.status;
              const effectiveStatusInfo = formatStatus(effectiveStatus);

              return (
                <div key={invite.id} className="rounded-xl border border-neutral-200 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${effectiveStatusInfo.className}`}
                      >
                        {effectiveStatusInfo.label}
                      </span>
                      {effectiveStatus === "PENDING" && (
                        <span className="text-xs text-neutral-500">
                          {formatExpiryHint(invite.expiresAt)}
                        </span>
                      )}
                    </div>
                    {(effectiveStatus === "PENDING" || effectiveStatus === "EXPIRED") && (
                      <StopPropagationDiv>
                        <button
                          type="button"
                          onClick={() => handleRevoke(invite.id)}
                          className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          Revocar enlace
                        </button>
                      </StopPropagationDiv>
                    )}
                  </div>

                  <div className="text-xs text-neutral-500">
                    Invitado: {inviteeLabel}
                  </div>

                  <div className="text-xs text-neutral-500">
                    Creada: {formatDate(invite.createdAt)} · Expira: {formatDate(invite.expiresAt)}
                  </div>

                  {effectiveStatus === "PENDING" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getInviteLink(invite.token)}
                        className="flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs text-neutral-900 outline-none"
                      />
                      <StopPropagationDiv>
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
                      </StopPropagationDiv>
                    </div>
                  )}

                  {invite.status === "CLAIMED" && invite.claimedAt && (
                    <div className="text-xs text-emerald-700">
                      Aceptada: {formatDate(invite.claimedAt)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para crear invitación */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">Generar invitación</h3>
            <p className="text-sm text-neutral-600">
              Genera un link de invitación para que un Team Leader (Cleaner) se conecte a este grupo de trabajo.
            </p>

              {generatedLink ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                    <label className="block text-sm font-medium text-neutral-700">
                      Link de invitación para "{workGroupName}"
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedLink}
                        className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:scale-[0.98] transition whitespace-nowrap"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99]"
                  >
                    Listo
                  </button>
                </div>
              ) : (
                <form ref={formRef} onSubmit={handleCreateInvite} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="prefillName" className="block text-sm font-medium text-neutral-800">
                      Nombre (opcional)
                    </label>
                    <input
                      type="text"
                      id="prefillName"
                      name="prefillName"
                      value={prefillName}
                      onChange={(e) => setPrefillName(e.target.value)}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                      placeholder="Nombre del Team Leader"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="expiresInDays" className="block text-sm font-medium text-neutral-800">
                      Expira en (días)
                    </label>
                    <input
                      type="number"
                      id="expiresInDays"
                      name="expiresInDays"
                      min={1}
                      max={30}
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(Number.parseInt(e.target.value) || 7)}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Generando..." : "Generar link"}
                  </button>
                </form>
              )}
          </div>
        </div>
      )}
    </section>
  );
}
