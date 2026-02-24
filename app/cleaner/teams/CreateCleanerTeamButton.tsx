"use client";

import { useEffect, useRef, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "@/lib/ui/BottomSheet";
import { createCleanerTeam } from "./actions";

export default function CreateCleanerTeamButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleOpen = () => {
    setError(null);
    setIsOpen(true);
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setName("");
    setNotes("");
    setError(null);
  }, []);

  // Drawer lifecycle (desktop)
  useEffect(() => {
    if (isMobile) return;
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else {
      setAnimateIn(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setMounted(false), 300);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen, isMobile]);

  // Escape to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) handleClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("name", name.trim());
    if (notes.trim()) formData.append("notes", notes.trim());
    formData.append("returnTo", "/cleaner/teams");

    startTransition(async () => {
      try {
        await createCleanerTeam(formData);
        handleClose();
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al crear el equipo.";
        setError(msg);
      }
    });
  };

  const form = (
    <div className="px-6 pt-8 pb-4 sm:pb-8 space-y-4">
      <p className="text-xs text-neutral-600">
        El equipo se creará en tu tenant hogar (no en el tenant del equipo “activo”).
      </p>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-800">Nombre del equipo *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
            placeholder="Ej. Mi squad, Equipo Centro"
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-800">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 resize-none"
            placeholder="Notas adicionales"
          />
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Creando..." : "Crear equipo"}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-lg border border-black bg-black px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99]"
      >
        Crear equipo
      </button>

      {isMobile ? (
        <BottomSheet isOpen={isOpen} onClose={handleClose} title="Nuevo equipo" maxHeight="90vh">
          {form}
        </BottomSheet>
      ) : mounted ? (
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
            className="relative w-[460px] max-w-full h-full bg-white shadow-2xl transform transition-transform ease-out rounded-tl-2xl rounded-bl-2xl"
            style={{
              transform: animateIn ? "translateX(0)" : "translateX(100%)",
              transitionDuration: "300ms",
              willChange: "transform",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <h2 className="text-xl font-semibold text-neutral-900">Nuevo equipo</h2>
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
            <div className="overflow-y-auto h-[calc(100%-73px)]">{form}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}


