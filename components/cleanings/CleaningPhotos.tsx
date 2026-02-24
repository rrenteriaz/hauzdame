"use client";

import { useState, useEffect } from "react";
import ImagePicker from "@/components/media/ImagePicker";
import { useRouter } from "next/navigation";

interface CleaningPhoto {
  id: string;
  assetId: string;
  url: string;
  takenAt: string | null;
  uploadedAt: string;
  sortOrder: number;
}

interface CleaningPhotosProps {
  cleaningId: string;
  canEdit: boolean;
  initialPhotos?: CleaningPhoto[];
  maxPhotos?: number;
}

/**
 * Componente para gestionar fotos de evidencia de una limpieza
 * Muestra grid de thumbnails, contador, y permite agregar/borrar fotos
 */
export default function CleaningPhotos({
  cleaningId,
  canEdit,
  initialPhotos = [],
  maxPhotos = 20,
}: CleaningPhotosProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState<CleaningPhoto[]>(initialPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<CleaningPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sincronizar con props cuando cambien
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  const handleFileSelect = async (
    file: File,
    previewUrl: string,
    takenAt: string | null,
    dimensions: { width: number; height: number } | null
  ) => {
    if (photos.length >= maxPhotos) {
      setError(`Máximo ${maxPhotos} fotos por limpieza`);
      return;
    }

    setIsUploading(true);
    setError(null);

    // Agregar preview optimista
    const optimisticPhoto: CleaningPhoto = {
      id: `temp-${Date.now()}`,
      assetId: `temp-${Date.now()}`,
      url: previewUrl,
      takenAt,
      uploadedAt: new Date().toISOString(),
      sortOrder: photos.length,
    };
    setPhotos((prev) => [...prev, optimisticPhoto]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("contextKind", "cleaningPhoto");
      formData.append("cleaningId", cleaningId);
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
        throw new Error(data.error || "Error subiendo foto");
      }

      const result = await response.json();
      
      // Reemplazar preview optimista con la foto real
      setPhotos((prev) => {
        const filtered = prev.filter((p) => p.id !== optimisticPhoto.id);
        return [
          ...filtered,
          {
            id: result.asset.id,
            assetId: result.asset.id,
            url: result.asset.url,
            takenAt: result.asset.takenAt,
            uploadedAt: result.asset.uploadedAt,
            sortOrder: filtered.length,
          },
        ];
      });

      // Revalidar página
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Error subiendo foto");
      // Remover preview optimista si falla
      setPhotos((prev) => prev.filter((p) => p.id !== optimisticPhoto.id));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (photo: CleaningPhoto) => {
    if (!canEdit) return;

    if (!confirm("¿Estás seguro de que quieres eliminar esta foto?")) {
      return;
    }

    setError(null);

    // Remover optimista
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));

    try {
      const response = await fetch(`/api/media/${photo.assetId}?contextKind=cleaningPhoto`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error eliminando foto");
      }

      // Revalidar página
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Error eliminando foto");
      // Restaurar foto si falla
      setPhotos((prev) => [...prev, photo].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  };

  const formatDate = (dateStr: string | null, fallback: string) => {
    if (!dateStr) return fallback;
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return fallback;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header con contador */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-800">
          Fotos {photos.length > 0 && `(${photos.length}/${maxPhotos})`}
        </h3>
        {canEdit && photos.length < maxPhotos && (
          <ImagePicker
            onSelect={handleFileSelect}
            capture="environment"
            disabled={isUploading}
          >
            <button
              type="button"
              disabled={isUploading}
              className="px-3 py-1.5 text-xs bg-neutral-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Subiendo..." : "+ Agregar foto"}
            </button>
          </ImagePicker>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Grid de thumbnails */}
      {photos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
          <p className="text-sm text-neutral-500">
            {canEdit ? "No hay fotos aún. Agrega la primera foto." : "No hay fotos de esta limpieza."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 group cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.url}
                  alt={`Foto ${photo.sortOrder + 1}`}
                  className="w-full h-full object-cover"
                />
                {canEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(photo);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    aria-label="Eliminar foto"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Modal visor */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-neutral-900 z-10"
              aria-label="Cerrar"
            >
              ×
            </button>
            <img
              src={selectedPhoto.url}
              alt="Foto de limpieza"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div
              className="mt-2 bg-white rounded-lg p-3 text-xs text-neutral-600"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedPhoto.takenAt ? (
                <p>Tomada: {formatDate(selectedPhoto.takenAt, "Fecha no disponible")}</p>
              ) : (
                <p>Subida: {formatDate(selectedPhoto.uploadedAt, "Fecha no disponible")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
