"use client";

import { useState } from "react";
import Link from "next/link";

interface PropertyFilterModalProps {
  properties: Array<{ id: string; name: string }>;
  selectedPropertyId: string;
  currentPeriod: string;
  currentStatus: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PropertyFilterModal({
  properties,
  selectedPropertyId,
  currentPeriod,
  currentStatus,
  isOpen,
  onClose,
}: PropertyFilterModalProps) {
  if (!isOpen) return null;

  const buildHref = (propertyId: string) => {
    const params = new URLSearchParams();
    if (propertyId) params.set("propertyId", propertyId);
    if (currentPeriod) params.set("period", currentPeriod);
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
              Seleccionar propiedad
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
            <Link
              href={buildHref("")}
              onClick={onClose}
              className={`block px-4 py-3 rounded-lg text-base transition ${
                !selectedPropertyId
                  ? "bg-neutral-100 text-neutral-900 font-medium"
                  : "text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              Todas las propiedades
            </Link>
            {properties.map((property) => (
              <Link
                key={property.id}
                href={buildHref(property.id)}
                onClick={onClose}
                className={`block px-4 py-3 rounded-lg text-base transition ${
                  selectedPropertyId === property.id
                    ? "bg-neutral-100 text-neutral-900 font-medium"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {property.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

