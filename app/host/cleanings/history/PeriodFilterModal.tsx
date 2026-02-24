"use client";

import Link from "next/link";

interface PeriodFilterModalProps {
  selectedPeriod: string;
  currentPropertyId: string;
  currentStatus: string;
  isOpen: boolean;
  onClose: () => void;
}

const PERIODS = [
  { value: "this-month", label: "Este mes" },
  { value: "previous-month", label: "Mes anterior" },
  { value: "this-year", label: "Este año" },
  { value: "last-year", label: "Año anterior" },
] as const;

export default function PeriodFilterModal({
  selectedPeriod,
  currentPropertyId,
  currentStatus,
  isOpen,
  onClose,
}: PeriodFilterModalProps) {
  if (!isOpen) return null;

  const buildHref = (period: string) => {
    const params = new URLSearchParams();
    if (currentPropertyId) params.set("propertyId", currentPropertyId);
    if (period) params.set("period", period);
    if (currentStatus) params.set("status", currentStatus);
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
              Seleccionar período
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
            {PERIODS.map((period) => (
              <Link
                key={period.value}
                href={buildHref(period.value)}
                onClick={onClose}
                className={`block px-4 py-3 rounded-lg text-base transition ${
                  selectedPeriod === period.value
                    ? "bg-neutral-100 text-neutral-900 font-medium"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {period.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

