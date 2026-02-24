/**
 * CONTRACT: docs/contracts/INVITES_V3.md
 * Esta página es pública y NO debe alterar reglas de invitación,
 * estados, permisos ni flujos de claim.
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type InviteType = "team" | "property";

interface TeamInviteInfo {
  teamId: string;
  teamName: string;
  inviterName?: string;
  teamDisplayName?: string;
  tenantId: string;
  status: string;
  expiresAt: string;
  prefillName: string | null;
  message: string | null;
}

interface PropertyInviteInfo {
  type: "PROPERTY";
  propertyId: string;
  propertyName: string;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  status: string;
  expiresAt: string;
  role: "CLEANER" | "MANAGER";
  inviterName: string;
  invitedEmail: string;
}

export default function JoinClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const inviteType: InviteType = searchParams.get("type") === "property" ? "property" : "team";
  const autoClaim =
    searchParams.get("auto") === "1" || searchParams.get("autoClaim") === "1";

  const [inviteInfo, setInviteInfo] = useState<TeamInviteInfo | PropertyInviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [autoClaimTriggered, setAutoClaimTriggered] = useState(false);

  // Cargar info del invite
  useEffect(() => {
    if (!token) {
      setError("Token de invitación requerido");
      setIsLoading(false);
      return;
    }

    async function fetchInvite() {
      try {
        const endpoint =
          inviteType === "property" ? `/api/property-invites/${token}` : `/api/invites/${token}`;
        const res = await fetch(endpoint);
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 404) {
            setError("Invitación no encontrada");
          } else if (res.status === 410) {
            setError(data.error || "Esta invitación ha expirado o ha sido revocada");
          } else {
            setError(data.error || "Error al cargar la invitación");
          }
          setIsLoading(false);
          return;
        }

        setInviteInfo(data);
      } catch (err) {
        setError("Error de conexión");
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvite();
  }, [token, inviteType]);

  const handleClaim = async () => {
    if (!token) return;

    setIsClaiming(true);
    setError(null);

    try {
      const endpoint =
        inviteType === "property"
          ? `/api/property-invites/${token}/claim`
          : `/api/invites/${token}/claim`;
      const res = await fetch(endpoint, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          // No autenticado, redirigir a login
          const redirectTo = `/join?token=${token}${inviteType === "property" ? "&type=property" : ""}&auto=1`;
          router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`);
          return;
        } else if (res.status === 409) {
          setError(data.error || "Este link ya fue usado por otro usuario");
        } else if (res.status === 410) {
          setError(data.error || "Esta invitación ha expirado o ha sido revocada");
        } else if (res.status === 403) {
          setError(data.error || "No tienes permiso para aceptar esta invitación");
        } else {
          setError(data.error || "Error al aceptar la invitación");
        }
        setIsClaiming(false);
        return;
      }

      // Claim exitoso, redirigir
      const redirectTo = data.redirectTo || "/app";
      router.replace(redirectTo);
    } catch (err) {
      setError("Error de conexión");
      setIsClaiming(false);
    }
  };

  useEffect(() => {
    if (!autoClaim || autoClaimTriggered || isClaiming || !inviteInfo) return;
    const now = new Date();
    const expiresAtDate = new Date(inviteInfo.expiresAt);
    const isExpiredByDate =
      !Number.isNaN(expiresAtDate.getTime()) && expiresAtDate < now;
    const effectiveStatus =
      inviteInfo.status === "PENDING" && isExpiredByDate
        ? "EXPIRED"
        : inviteInfo.status;
    if (effectiveStatus !== "PENDING") return;
    setAutoClaimTriggered(true);
    void handleClaim();
  }, [autoClaim, autoClaimTriggered, inviteInfo, isClaiming]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatStatus = (status: string): { label: string; className: string } => {
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
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-neutral-600">Cargando invitación...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Invitación inválida</h1>
            <p className="text-neutral-600 mb-6">{error}</p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!inviteInfo) {
    return null;
  }

  const now = new Date();
  const expiresAtDate = new Date(inviteInfo.expiresAt);
  const isExpiredByDate =
    !Number.isNaN(expiresAtDate.getTime()) && expiresAtDate < now;
  const effectiveStatus =
    inviteInfo.status === "PENDING" && isExpiredByDate
      ? "EXPIRED"
      : inviteInfo.status;
  const statusInfo = formatStatus(effectiveStatus);
  const isPropertyInvite = inviteType === "property";
  const propertyInvite = isPropertyInvite ? (inviteInfo as PropertyInviteInfo) : null;
  const teamLabel =
    !isPropertyInvite && "teamName" in inviteInfo
      ? inviteInfo.teamDisplayName || inviteInfo.teamName || "Equipo"
      : "Equipo";
  const propertyLabel =
    isPropertyInvite && "propertyName" in inviteInfo
      ? inviteInfo.propertyName
      : "Propiedad";
  const messageFallback = isPropertyInvite
    ? "Te han invitado a colaborar en una propiedad en Hausdame."
    : "Te han invitado a unirte a un equipo de Cleaners en Hausdame.";
  const roleLabel = isPropertyInvite
    ? propertyInvite?.role === "MANAGER"
      ? "Manager de propiedad"
      : "Cleaner de propiedad"
    : "Miembro del equipo";
  const inviteMessage =
    !isPropertyInvite && "message" in inviteInfo ? inviteInfo.message : null;
  const joinRedirect = `/join?token=${token}${inviteType === "property" ? "&type=property" : ""}`;
  const isPending = effectiveStatus === "PENDING";
  const isExpired = effectiveStatus === "EXPIRED";
  const isRevoked = effectiveStatus === "REVOKED";

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="flex flex-col items-center text-center gap-3">
          <div className="flex items-center gap-2 text-neutral-900">
            <div className="h-8 w-8 rounded-xl bg-black text-white flex items-center justify-center text-sm font-semibold">
              H
            </div>
            <span className="text-lg font-semibold">Hausdame</span>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {isPropertyInvite
              ? "Tienes una invitación para colaborar en una propiedad"
              : "Tienes una invitación para unirte a un equipo"}
          </h1>
        </header>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-neutral-500">
                {isPropertyInvite ? "Propiedad" : "Equipo"}
              </p>
              <p className="text-lg font-semibold text-neutral-900">
                {isPropertyInvite ? propertyLabel : teamLabel}
              </p>
            </div>
            <span
              className={`text-[11px] px-2 py-1 rounded-full font-medium ${statusInfo.className}`}
            >
              {statusInfo.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-neutral-700">
            <div>
              <p className="text-xs text-neutral-500">Vigencia</p>
              <p className="font-medium text-neutral-900">{formatDate(inviteInfo.expiresAt)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Rol</p>
              <p className="font-medium text-neutral-900">{roleLabel}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-neutral-900 mb-2">Qué incluye</p>
            {isPropertyInvite ? (
              <ul className="text-sm text-neutral-600 space-y-1 list-disc list-inside">
                <li>Acceso operativo a la propiedad</li>
                <li>Limpiezas y tareas relacionadas</li>
                <li>Historial de actividad</li>
              </ul>
            ) : (
              <ul className="text-sm text-neutral-600 space-y-1 list-disc list-inside">
                <li>Limpiezas asignadas y próximas</li>
                <li>Chats con el equipo y anfitriones</li>
                <li>Historial de limpiezas realizadas</li>
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
            <p className="text-xs font-medium text-neutral-500 mb-1">Mensaje de invitación</p>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">
              {inviteMessage || messageFallback}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          {isPending ? (
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="w-full py-2.5 px-4 bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isClaiming ? "Aceptando..." : "Aceptar invitación"}
            </button>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
              {isExpired
                ? "Esta invitación expiró. Solicita un nuevo enlace."
                : isRevoked
                ? "Esta invitación fue revocada. Solicita un nuevo enlace."
                : "Esta invitación ya fue aceptada."}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href={`/login?redirect=${encodeURIComponent(joinRedirect)}`}
              className="flex-1 py-2 px-4 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 text-center font-medium"
            >
              Iniciar sesión
            </Link>
            <Link
              href={`/signup?token=${token}${inviteType === "property" ? "&type=property" : ""}`}
              className="flex-1 py-2 px-4 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 text-center font-medium"
            >
              Crear cuenta
            </Link>
          </div>

          <div className="text-xs text-neutral-500">
            Este enlace expira automáticamente. Si tienes dudas, contacta a la persona que te invitó.
          </div>

          <div className="text-center text-sm text-neutral-500">
            <Link href="/login" className="text-blue-600 hover:text-blue-700">
              Ir al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

