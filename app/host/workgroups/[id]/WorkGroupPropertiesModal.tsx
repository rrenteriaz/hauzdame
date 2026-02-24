"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BottomSheet from "@/lib/ui/BottomSheet";
import { updateWorkGroupProperties } from "../actions";

interface PropertyOption {
  id: string;
  name: string;
  shortName: string | null;
  address: string | null;
  isActive: boolean;
}

interface WorkGroupPropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  workGroupId: string;
  properties: PropertyOption[];
  assignedPropertyIds: string[];
  onSaved: () => void;
}

export default function WorkGroupPropertiesModal({
  isOpen,
  onClose,
  workGroupId,
  properties,
  assignedPropertyIds,
  onSaved,
}: WorkGroupPropertiesModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => {
    if (!isOpen) return;
    setSelected(new Set(assignedPropertyIds));
    setError(null);
  }, [isOpen, assignedPropertyIds]);

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const sortedProperties = useMemo(() => {
    return [...properties].sort((a, b) => {
      const nameA = (a.shortName || a.name || "").toLowerCase();
      const nameB = (b.shortName || b.name || "").toLowerCase();
      return nameA.localeCompare(nameB, "es");
    });
  }, [properties]);

  const toggleProperty = (propertyId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("workGroupId", workGroupId);
      formData.set("propertyIds", JSON.stringify(Array.from(selected)));
      await updateWorkGroupProperties(formData);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || "No se pudieron guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  const content = (
    <div className="space-y-4">
      {sortedProperties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-600">
          No hay propiedades activas disponibles.
        </div>
      ) : (
        <div className="space-y-2">
          {sortedProperties.map((property) => {
            const checked = selected.has(property.id);
            return (
              <label
                key={property.id}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                  checked ? "border-neutral-300 bg-neutral-50" : "border-neutral-200 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleProperty(property.id)}
                  className="mt-1 h-4 w-4 accent-black"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {property.shortName || property.name}
                  </p>
                  {property.shortName && property.name !== property.shortName && (
                    <p className="text-xs text-neutral-500 truncate">{property.name}</p>
                  )}
                  {property.address && (
                    <p className="text-xs text-neutral-500 truncate">{property.address}</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-4 border-t border-neutral-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Asignar propiedades" maxHeight="90vh">
        <div className="px-6 pt-6 pb-4">{content}</div>
      </BottomSheet>
    );
  }

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity ${
        animateIn ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative z-[101] w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl transform transition-transform ${
          animateIn ? "translate-y-0" : "translate-y-6"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Asignar propiedades</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 text-neutral-500 hover:text-neutral-900 transition rounded-full hover:bg-neutral-100"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {content}
      </div>
    </div>
  );
}

