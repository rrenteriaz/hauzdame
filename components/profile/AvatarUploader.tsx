"use client";

import { useState } from "react";
import ImagePicker from "@/components/media/ImagePicker";
import { useRouter } from "next/navigation";

interface AvatarUploaderProps {
  userId: string;
  currentAvatarUrl?: string | null;
  currentAvatarId?: string | null;
  size?: "sm" | "md" | "lg";
}

/**
 * Componente para subir/cambiar/quitar el avatar de un usuario
 */
export default function AvatarUploader({
  userId,
  currentAvatarUrl,
  currentAvatarId,
  size = "md",
}: AvatarUploaderProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const [error, setError] = useState<string | null>(null);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const handleFileSelect = async (
    file: File,
    previewUrl: string,
    takenAt: string | null,
    dimensions: { width: number; height: number } | null
  ) => {
    setIsUploading(true);
    setError(null);
    setPreviewUrl(previewUrl); // Preview optimista

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("contextKind", "userAvatar");
      formData.append("userId", userId);
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
        throw new Error(data.error || "Error subiendo avatar");
      }

      const result = await response.json();
      
      // Actualizar preview con la URL real
      setPreviewUrl(result.asset.url);
      
      // Revalidar la página
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Error subiendo avatar");
      // Revertir preview si falla
      setPreviewUrl(currentAvatarUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentAvatarId) return;

    if (!confirm("¿Estás seguro de que quieres quitar tu foto de perfil?")) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(`/api/media/${currentAvatarId}?contextKind=userAvatar&userId=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error eliminando avatar");
      }

      setPreviewUrl(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Error eliminando avatar");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-800">Foto de perfil</h3>
      
      {/* Preview circular */}
      <div className="flex items-center gap-4">
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-neutral-200 bg-neutral-100 flex items-center justify-center`}>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-neutral-400 text-2xl">👤</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <ImagePicker
            onSelect={handleFileSelect}
            capture="user"
            disabled={isUploading}
          >
            <button
              type="button"
              disabled={isUploading}
              className="px-4 py-2 bg-neutral-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isUploading ? "Subiendo..." : previewUrl ? "Cambiar foto" : "Agregar foto"}
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
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
