"use client";

import { useState } from "react";
import BottomSheet from "@/lib/ui/BottomSheet";

interface CreateInvitationSheetProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onInviteCreated: () => void;
}

export default function CreateInvitationSheet({
  teamId,
  isOpen,
  onClose,
  onInviteCreated,
}: CreateInvitationSheetProps) {
  const [prefillName, setPrefillName] = useState("");
  const [message, setMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setGeneratedLink(null);

    try {
      const response = await fetch(`/api/teams/${teamId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefillName: prefillName.trim() || null,
          message: message.trim() || null,
          expiresInDays,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Error al generar el link de invitación");
      }

      const data = await response.json();
      // Construir URL usando window.location.origin en el cliente para evitar 0.0.0.0
      if (typeof window !== "undefined") {
        const clientInviteLink = `${window.location.origin}/join?token=${data.invite.token}`;
        setGeneratedLink(clientInviteLink);
      } else {
        setGeneratedLink(data.inviteLink);
      }
      // No cerrar automáticamente, mostrar el link generado
    } catch (err: any) {
      setError(err.message || "Error al generar el link de invitación");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;

    try {
      await navigator.clipboard.writeText(generatedLink);
      // Opcional: mostrar toast de éxito
    } catch (err) {
      // Fallback: seleccionar texto para copiar manualmente
      const textArea = document.createElement("textarea");
      textArea.value = generatedLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  const handleClose = () => {
    // Resetear estado al cerrar
    setPrefillName("");
    setMessage("");
    setExpiresInDays(7);
    setGeneratedLink(null);
    setError(null);
    onClose();
  };

  const handleDone = () => {
    handleClose();
    onInviteCreated(); // Refrescar lista
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Crear invitación" maxHeight="90vh">
      <div className="px-6 pt-8 pb-4 sm:pb-8 space-y-4">
        {generatedLink ? (
          <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
            <label className="block text-sm font-medium text-neutral-700">
              Link de invitación generado
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDone}
              className="flex-1 rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99]"
            >
              Listo
            </button>
          </div>
        </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-800">
                Nombre (opcional)
              </label>
              <input
                type="text"
                value={prefillName}
                onChange={(e) => setPrefillName(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                placeholder="Nombre del cleaner"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-800">
                Mensaje (opcional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 resize-none"
                placeholder="Mensaje personalizado para el cleaner"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-800">
                Expira en (días)
              </label>
              <input
                type="number"
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
              disabled={isGenerating}
              className="w-full rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generando..." : "Generar link"}
            </button>
          </form>
        )}
      </div>
    </BottomSheet>
  );
}

