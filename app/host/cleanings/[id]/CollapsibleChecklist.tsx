"use client";

import { useState } from "react";

interface CollapsibleChecklistProps {
  title: string;
  itemsCount: number;
  completedCount: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleChecklist({
  title,
  itemsCount,
  completedCount,
  children,
  defaultOpen = false,
}: CollapsibleChecklistProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
          <span className="text-xs text-neutral-500">
            ({completedCount}/{itemsCount})
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4 pt-0 border-t border-neutral-100">
          {children}
        </div>
      )}
    </section>
  );
}

