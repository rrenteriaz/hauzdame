"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

export default function Toast({
  message,
  type = "info",
  duration = 4000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeClasses = {
    success: "bg-emerald-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-neutral-900 text-white",
  };

  const toastContent = (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[10000] pointer-events-none">
      <div
        className={`${typeClasses[type]} rounded-lg px-4 py-3 shadow-lg pointer-events-auto animate-in slide-in-from-bottom-2`}
      >
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );

  if (typeof window !== "undefined") {
    return createPortal(toastContent, document.body);
  }

  return null;
}

