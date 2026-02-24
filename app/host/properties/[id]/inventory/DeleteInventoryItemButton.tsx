"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteInventoryLineAction } from "@/app/host/inventory/actions";

interface DeleteInventoryItemButtonProps {
  lineId: string;
  propertyId: string;
  itemName: string;
}

export default function DeleteInventoryItemButton({
  lineId,
  propertyId,
  itemName,
}: DeleteInventoryItemButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    const formData = new FormData();
    formData.set("lineId", lineId);
    formData.set("propertyId", propertyId);

    startTransition(async () => {
      try {
        await deleteInventoryLineAction(formData);
        router.refresh();
      } catch (error: any) {
        console.error("Error al eliminar item:", error);
        alert(error?.message || "Ocurrió un error al eliminar el item");
        setShowConfirm(false);
      }
    });
  };

  return (
    <>
      {showConfirm ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowConfirm(false);
            }}
            className="text-xs text-neutral-600 hover:text-neutral-900 transition-colors px-2 py-1"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isPending}
            className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors px-2 py-1 disabled:opacity-50"
          >
            {isPending ? "Eliminando..." : "Confirmar"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="text-neutral-500 hover:text-red-600 transition-colors px-2 py-1"
          aria-label={`Eliminar ${itemName}`}
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      )}
    </>
  );
}

