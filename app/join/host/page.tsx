// app/join/host/page.tsx
// Ruta pública para claim de invitaciones HostWorkGroupInvite (Server Component)
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import JoinHostClient from "./JoinHostClient";

interface PageProps {
  searchParams: Promise<{ token?: string; auto?: string }>;
}

export default async function JoinHostPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams?.token;
  const autoClaim = resolvedSearchParams?.auto === "1" || resolvedSearchParams?.auto === "true";

  if (!token) {
    notFound();
  }

  // Verificar que el modelo está disponible
  if (!(prisma as any).hostWorkGroupInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Error del sistema</h1>
            <p className="text-neutral-600 mb-6">
              El modelo HostWorkGroupInvite no está disponible. Por favor, regenera Prisma Client y reinicia el servidor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Obtener información de la invitación (SSR)
  const invite = await (prisma as any).hostWorkGroupInvite.findUnique({
    where: { token },
    include: {
      workGroup: {
        select: {
          id: true,
          name: true,
        },
      },
      createdByUser: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Invitación inválida</h1>
            <p className="text-neutral-600 mb-6">Invitación no encontrada</p>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const expiresAt = new Date(invite.expiresAt);
  const isExpired = expiresAt < now;
  const effectiveStatus =
    invite.status === "PENDING" && isExpired ? "EXPIRED" : invite.status;

  if (effectiveStatus !== "PENDING") {
    const errorMessage =
      effectiveStatus === "EXPIRED"
        ? "Esta invitación ha expirado"
        : effectiveStatus === "REVOKED"
        ? "Esta invitación ha sido revocada"
        : "Esta invitación ya fue aceptada";

    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Invitación inválida</h1>
            <p className="text-neutral-600 mb-6">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  // Verificar si el usuario está autenticado
  const currentUser = await getCurrentUser();

  // Preparar datos para el cliente
  const inviteInfo = {
    id: invite.id,
    workGroupId: invite.workGroupId,
    workGroupName: invite.workGroup.name,
    status: effectiveStatus,
    expiresAt: invite.expiresAt.toISOString(),
    prefillName: invite.prefillName,
    message: invite.message,
    createdAt: invite.createdAt.toISOString(),
    createdByUser: {
      name: invite.createdByUser.name,
    },
  };

  return (
    <JoinHostClient
      inviteInfo={inviteInfo}
      token={token}
      autoClaim={autoClaim}
      isAuthenticated={!!currentUser}
    />
  );
}
