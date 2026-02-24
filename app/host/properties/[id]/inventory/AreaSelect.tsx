"use client";

import { useState, useEffect, useRef } from "react";

interface AreaSelectProps {
  value: string;
  onChange: (area: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function AreaSelect({
  value,
  onChange,
  suggestions,
  placeholder = "Ej: Cocina, Baño, Recámara 1...",
  required = false,
  className = "",
}: AreaSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrar sugerencias por búsqueda
  const filteredSuggestions = searchTerm
    ? suggestions.filter((s) =>
        s.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : suggestions;

  const handleOpen = () => {
    setIsOpen(true);
    setSearchTerm("");
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleSelect = (area: string) => {
    onChange(area);
    handleClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Cerrar modal con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Focus en el input de búsqueda cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      const searchInput = modalRef.current?.querySelector('input[type="text"]') as HTMLInputElement;
      if (searchInput) {
        setTimeout(() => {
          searchInput.focus();
        }, 100);
      }
    }
  }, [isOpen]);

  return (
    <>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleOpen}
          placeholder={placeholder}
          required={required}
          maxLength={80}
          className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300 ${className}`}
        />
        <button
          type="button"
          onClick={handleOpen}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
          aria-label="Abrir selector de áreas"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-end justify-center p-4 pt-20 sm:pt-4"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal desde arriba en móvil, desde abajo en desktop */}
          <div
            ref={modalRef}
            className="relative z-10 w-full max-w-xs rounded-2xl sm:rounded-t-2xl border border-neutral-200 sm:border-t sm:border-x bg-white shadow-xl max-h-[60vh] overflow-hidden flex flex-col animate-in slide-in-from-top sm:slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900 px-4 py-3 border-b border-neutral-200">
              Seleccionar área
            </h3>

            {/* Búsqueda */}
            <div className="px-4 py-3 border-b border-neutral-200">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar área..."
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                autoFocus
              />
            </div>

            {/* Lista de sugerencias */}
            <div className="flex-1 overflow-y-auto">
              {filteredSuggestions.length === 0 ? (
                <p className="text-base text-neutral-500 text-center py-8">
                  {searchTerm ? "No se encontraron resultados" : "No hay áreas disponibles"}
                </p>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredSuggestions.map((area) => {
                    const isSelected = area === value;
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => handleSelect(area)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-base transition ${
                          isSelected
                            ? "bg-black text-white font-medium"
                            : "text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100"
                        }`}
                      >
                        {area}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

