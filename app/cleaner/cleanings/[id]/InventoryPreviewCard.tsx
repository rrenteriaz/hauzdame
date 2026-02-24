"use client";

import { useState } from "react";

interface InventoryPreviewCardProps {
  itemsCount: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function InventoryPreviewCard({
  itemsCount,
  children,
  defaultOpen = false,
}: InventoryPreviewCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-neutral-800">Inventario</h3>
          <span className="text-xs text-neutral-500">
            ({itemsCount} {itemsCount === 1 ? "item" : "items"})
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4 pt-0 border-t border-neutral-100">
          <p className="text-xs text-neutral-500 mb-3">
            Referencia de items disponibles en la propiedad
          </p>
          {children}
          <p className="text-xs text-neutral-400 mt-4 pt-3 border-t border-neutral-100">
            La revisión oficial del inventario se realiza al finalizar la limpieza.
          </p>
        </div>
      )}
    </section>
  );
}

