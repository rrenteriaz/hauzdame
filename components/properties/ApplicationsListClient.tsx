// components/properties/ApplicationsListClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Application {
  id: string;
  createdAt: string;
  chatThread: {
    id: string;
  } | null;
  applicantUser: {
    id: string;
    name: string | null;
    email: string;
    avatarMedia: {
      id: string;
      publicUrl: string | null;
    } | null;
  };
}

interface ApplicationsListClientProps {
  applications: Application[];
  propertyId: string;
}

export function ApplicationsListClient({
  applications: initialApplications,
  propertyId,
}: ApplicationsListClientProps) {
  const router = useRouter();
  const [applications, setApplications] = useState(initialApplications);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAccept = async (applicationId: string) => {
    if (processing) return;

    try {
      setProcessing(applicationId);
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          status: "ACCEPTED",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Error aceptando solicitud");
        return;
      }

      // Remover de la lista
      setApplications((prev) => prev.filter((app) => app.id !== applicationId));

      // Si hay threadId, navegar al chat
      if (data.threadId) {
        router.replace(`/host/messages/${data.threadId}`);
      } else {
        // Mostrar mensaje de éxito
        alert("Cleaner agregado al equipo de la propiedad");
      }
    } catch (error) {
      console.error("Error aceptando solicitud:", error);
      alert("Error al aceptar solicitud");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    if (processing) return;

    if (!confirm("¿Estás seguro de rechazar esta solicitud?")) {
      return;
    }

    try {
      setProcessing(applicationId);
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          status: "REJECTED",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error rechazando solicitud");
        return;
      }

      // Remover de la lista
      setApplications((prev) => prev.filter((app) => app.id !== applicationId));
    } catch (error) {
      console.error("Error rechazando solicitud:", error);
      alert("Error al rechazar solicitud");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-3">
      {applications.map((app) => (
        <div
          key={app.id}
          className="bg-white rounded-lg border border-neutral-200 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-semibold text-neutral-600 shrink-0">
              {app.applicantUser.avatarMedia?.publicUrl ? (
                <img
                  src={app.applicantUser.avatarMedia.publicUrl}
                  alt={app.applicantUser.name || "Usuario"}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                (app.applicantUser.name || app.applicantUser.email)
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-neutral-900 mb-1">
                {app.applicantUser.name || app.applicantUser.email}
              </div>
              <div className="text-sm text-neutral-500 mb-3">
                Aplicó el{" "}
                {new Date(app.createdAt).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="flex gap-2">
                {app.chatThread && (
                  <button
                    onClick={() => router.push(`/host/messages/${app.chatThread!.id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
                  >
                    Ver chat
                  </button>
                )}
                <button
                  onClick={() => handleAccept(app.id)}
                  disabled={processing === app.id}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
                >
                  {processing === app.id ? "Procesando..." : "Aceptar"}
                </button>
                <button
                  onClick={() => handleReject(app.id)}
                  disabled={processing === app.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
                >
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

