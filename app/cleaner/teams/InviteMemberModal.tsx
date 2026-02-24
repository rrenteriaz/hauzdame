"use client";

import { useEffect, useRef, useState } from "react";
import BottomSheet from "@/lib/ui/BottomSheet";

interface InviteMemberModalProps {
  teamId: string;
  teamName: string;
  isOpen: boolean;
  onClose: () => void;
  onInviteCreated: () => void;
}

export default function InviteMemberModal({
  teamId,
  teamName,
  isOpen,
  onClose,
  onInviteCreated,
}: InviteMemberModalProps) {
  const [prefillName, setPrefillName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Ciclo de vida para drawer desktop
  useEffect(() => {
    if (!isOpen) {
      setAnimateIn(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setMounted(false), 300);
      return;
    }

    setMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimateIn(true));
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen]);

  // Escape para cerrar (drawer desktop)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const resetState = () => {
    setPrefillName("");
    setExpiresInDays(7);
    setGeneratedLink(null);
    setError(null);
    setIsGenerating(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setGeneratedLink(null);

    try {
      const trimmedPrefill = prefillName.trim();
      const payload = {
        prefillName: trimmedPrefill || null,
        expiresInDays,
      };
      const response = await fetch(`/api/teams/${teamId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Error al generar el link de invitación");
      }

      const data: { invite: { token: string } } = await response.json();

      // Usar origin del cliente para evitar 0.0.0.0
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setGeneratedLink(`${origin}/join?token=${data.invite.token}`);
      onInviteCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al generar el link de invitación";
      setError(message);
    } finally {
      setIsGenerating(false);
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

  const content = (
    <div className="px-6 pt-8 pb-4 sm:pb-8 space-y-4">
      {generatedLink ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
            <label className="block text-sm font-medium text-neutral-700">
              Link de invitación para “{teamName}”
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
  );

  // Móvil: BottomSheet
  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={handleClose} title="Invitar miembro" maxHeight="90vh">
        {content}
      </BottomSheet>
    );
  }

  // Desktop: Drawer lateral
  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        style={{ opacity: animateIn ? 1 : 0, transitionDuration: "300ms" }}
      />

      <div
        className="relative w-[420px] max-w-full h-full bg-white shadow-2xl transform transition-transform ease-out rounded-tl-2xl rounded-bl-2xl"
        style={{
          transform: animateIn ? "translateX(0)" : "translateX(100%)",
          transitionDuration: "300ms",
          willChange: "transform",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-neutral-900">Invitar miembro</h2>
            <p className="text-xs text-neutral-500 mt-1 truncate">{teamName}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 -mr-2 text-neutral-500 hover:text-neutral-900 transition rounded-full hover:bg-neutral-100"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-73px)]">{content}</div>
      </div>
    </div>
  );
}


