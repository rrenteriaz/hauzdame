// components/chat/ImageMessage.tsx
"use client";

import { useState, useEffect } from "react";

interface ImageMessageProps {
  assetId: string;
  publicUrl: string | null | undefined;
  onImageClick: () => void;
}

export function ImageMessage({ assetId, publicUrl, onImageClick }: ImageMessageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(publicUrl || null);
  const [loading, setLoading] = useState(!publicUrl);

  useEffect(() => {
    // Si no hay publicUrl, obtener signed URL
    if (!publicUrl && assetId) {
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
    } else {
      setLoading(false);
    }
  }, [assetId, publicUrl]);

  if (loading) {
    return (
      <div className="w-48 h-48 bg-neutral-200 rounded flex items-center justify-center">
        <span className="text-xs text-neutral-500">Cargando...</span>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="w-48 h-48 bg-neutral-200 rounded flex items-center justify-center">
        <span className="text-xs text-neutral-500">Error cargando imagen</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt="Imagen"
      className="max-w-[300px] max-h-[300px] rounded cursor-pointer hover:opacity-90 transition-opacity"
      onClick={onImageClick}
    />
  );
}

