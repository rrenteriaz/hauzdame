"use client";

import { useState, useRef } from "react";
import ImagePicker from "@/components/media/ImagePicker";
import { useRouter } from "next/navigation";

interface PropertyCoverUploaderProps {
  propertyId: string;
  currentCoverUrl?: string | null;
  currentCoverId?: string | null;
}

/**
 * Componente para subir/cambiar/quitar la imagen de portada de una propiedad
 */
export default function PropertyCoverUploader({
  propertyId,
  currentCoverUrl,
  currentCoverId,
}: PropertyCoverUploaderProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentCoverUrl || null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (
    file: File,
    previewUrl: string,
    takenAt: string | null,
    dimensions: { width: number; height: number } | null
  ) => {
    setIsUploading(true);
    setError(null);
    setPreviewUrl(previewUrl); // Mostrar preview optimista

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("contextKind", "propertyCover");
      formData.append("propertyId", propertyId);
      if (takenAt) {
        formData.append("takenAt", takenAt);
      }
      if (dimensions) {
        formData.append("width", dimensions.width.toString());
        formData.append("height", dimensions.height.toString());
      }

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error subiendo imagen");
      }

      const result = await response.json();
      
      // Actualizar preview con la URL real del servidor
      setPreviewUrl(result.asset.url);
      
      // Revalidar la página para mostrar la nueva imagen
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Error subiendo imagen");
      // Revertir preview si falla
      setPreviewUrl(currentCoverUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentCoverId) return;

    if (!confirm("¿Estás seguro de que quieres quitar la imagen de portada?")) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(`/api/media/${currentCoverId}?contextKind=propertyCover`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error eliminando imagen");
      }

      setPreviewUrl(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Error eliminando imagen");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-800">Imagen de la propiedad</h3>
      
      {/* Preview */}
      {previewUrl && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50">
          <img
            src={previewUrl}
            alt="Portada de propiedad"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Controles */}
      <div className="flex items-center gap-2">
        <ImagePicker
          onSelect={handleFileSelect}
          capture="environment"
          disabled={isUploading}
          className="flex-1"
        >
          <button
            type="button"
            disabled={isUploading}
            className="w-full px-4 py-2 bg-neutral-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isUploading ? "Subiendo..." : previewUrl ? "Cambiar imagen" : "Agregar imagen"}
          </button>
        </ImagePicker>
        
        {previewUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUploading}
            className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Quitar
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
