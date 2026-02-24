"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  confirmAction: () => void;
  variant?: "danger" | "warning";
  disabled?: boolean; // Para deshabilitar botones durante loading
}

export default function ConfirmModal({
  isOpen,
  onClose,
  title,
  message,
  confirmText,
  cancelText = "Cancelar",
  confirmAction,
  variant = "danger",
  disabled = false,
}: ConfirmModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !disabled) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, disabled]);

  const variantClasses = {
    danger: {
      button: "border-red-500 bg-red-500 text-white hover:bg-red-600",
      title: "text-red-900",
    },
    warning: {
      button: "border-amber-500 bg-amber-500 text-white hover:bg-amber-600",
      title: "text-amber-900",
    },
  };

  const classes = variantClasses[variant];

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={() => {
        if (!disabled) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-[10000] w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-lg font-semibold ${classes.title} mb-3`}>
          {title}
        </h3>
        <p className="text-base text-neutral-700 mb-6 whitespace-pre-line leading-relaxed">
          {message}
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={confirmAction}
            disabled={disabled}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-base font-medium transition active:scale-[0.99] ${classes.button} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            disabled={disabled}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );

  // Renderizar el modal usando portal directamente en el body para evitar problemas de z-index
  if (!isOpen) return null;
  
  if (typeof window !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  
  return null;
}

