"use client";

import Link from "next/link";

interface StatusFilterModalProps {
  selectedStatus: string;
  currentPropertyId: string;
  currentPeriod: string;
  isOpen: boolean;
  onClose: () => void;
}

const STATUSES = [
  { value: "", label: "Todos los estados" },
  { value: "PENDING", label: "Pendiente" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "COMPLETED", label: "Completada" },
  { value: "CANCELLED", label: "Cancelada" },
] as const;

export default function StatusFilterModal({
  selectedStatus,
  currentPropertyId,
  currentPeriod,
  isOpen,
  onClose,
}: StatusFilterModalProps) {
  if (!isOpen) return null;

  const buildHref = (status: string) => {
    const params = new URLSearchParams();
    if (currentPropertyId) params.set("propertyId", currentPropertyId);
    if (currentPeriod) params.set("period", currentPeriod);
    if (status) params.set("status", status);
    return `/host/cleanings/history?${params.toString()}`;
  };

  return (
    <>
      <style>{`
        @keyframes slideUpModal {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/40 transition-opacity duration-300" />
        <div
          className="relative z-10 w-full max-w-md bg-white rounded-t-2xl shadow-xl overflow-hidden"
          style={{
            animation: "slideUpModal 0.3s ease-out",
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="p-4 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">
              Seleccionar estado
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          <div className="p-2">
            {STATUSES.map((status) => (
              <Link
                key={status.value}
                href={buildHref(status.value)}
                onClick={onClose}
                className={`block px-4 py-3 rounded-lg text-base transition ${
                  selectedStatus === status.value
                    ? "bg-neutral-100 text-neutral-900 font-medium"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {status.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

