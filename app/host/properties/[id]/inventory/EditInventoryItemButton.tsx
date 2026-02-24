"use client";

import { useState } from "react";
import AddInventoryItemModal from "./AddInventoryItemModal";
import {
  editInventoryCache,
  type EditData,
} from "@/lib/client/editInventoryCache";

interface EditInventoryItemButtonProps {
  lineId: string;
  propertyId: string;
}

export default function EditInventoryItemButton({
  lineId,
  propertyId,
}: EditInventoryItemButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState<EditData>(null);
  const [isLoading, setIsLoading] = useState(false);

  const prefetch = () => {
    editInventoryCache.prefetch(propertyId, lineId);
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) return;

    // Cache hit: abrir instantáneo
    const cached = editInventoryCache.get(propertyId, lineId);
    if (cached) {
      setEditData(cached);
      setIsOpen(true);
      return;
    }

    // Fallback: fetch y abrir
    setIsLoading(true);
    try {
      const data = await editInventoryCache.prefetch(propertyId, lineId);
      if (data?.line) {
        setEditData(data);
        setIsOpen(true);
      }
    } catch {
      // Silenciar — el modal mostraría error si se abriera
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        onMouseEnter={prefetch}
        onFocus={prefetch}
        onTouchStart={prefetch}
        className="text-neutral-500 hover:text-neutral-900 transition-colors px-2 py-1 disabled:opacity-50 disabled:cursor-wait"
        aria-label="Editar item"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>
      {isOpen && editData && (
        <AddInventoryItemModal
          propertyId={propertyId}
          lineId={lineId}
          initialEditData={editData}
          onClose={() => {
            setIsOpen(false);
            setEditData(null);
          }}
          onCacheInvalidate={() => editInventoryCache.invalidate(propertyId, lineId)}
        />
      )}
    </>
  );
}

