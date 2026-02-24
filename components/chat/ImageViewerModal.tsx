// components/chat/ImageViewerModal.tsx
"use client";

import { useState, useEffect } from "react";

interface ImageViewerModalProps {
  assetId: string;
  onClose: () => void;
}

export function ImageViewerModal({ assetId, onClose }: ImageViewerModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/assets/${assetId}/signed`)
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          setImageUrl(data.url);
        }
      })
      .catch((error) => {
        console.error("Error obteniendo signed URL:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [assetId]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-4xl max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
          aria-label="Cerrar"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        {loading ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <span className="text-neutral-600">Cargando imagen...</span>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="Imagen"
            className="max-w-full max-h-[90vh] rounded-lg"
          />
        ) : (
          <div className="bg-white rounded-lg p-8 text-center">
            <span className="text-neutral-600">Error cargando imagen</span>
          </div>
        )}
      </div>
    </div>
  );
}

