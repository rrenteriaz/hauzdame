"use client";

import { useRef, useState } from "react";
import { extractTakenAtFromFile, extractImageDimensions } from "@/lib/media/exif";

interface ImagePickerProps {
  onSelect: (file: File, previewUrl: string, takenAt: string | null, dimensions: { width: number; height: number } | null) => void;
  accept?: string;
  capture?: "user" | "environment";
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Componente para seleccionar imágenes desde cámara o galería
 * En móvil, permite capturar foto o elegir del dispositivo
 */
export default function ImagePicker({
  onSelect,
  accept = "image/*",
  capture,
  disabled = false,
  className = "",
  children,
}: ImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // Crear preview URL
      const previewUrl = URL.createObjectURL(file);

      // Extraer EXIF takenAt en paralelo con dimensiones
      const [takenAt, dimensions] = await Promise.all([
        extractTakenAtFromFile(file),
        extractImageDimensions(file),
      ]);

      // Llamar callback con todos los datos
      onSelect(file, previewUrl, takenAt, dimensions);
    } catch (error) {
      console.error("Error procesando imagen:", error);
      // Aún así, permitir subir sin EXIF
      const previewUrl = URL.createObjectURL(file);
      onSelect(file, previewUrl, null, null);
    } finally {
      setIsProcessing(false);
      // Resetear input para permitir seleccionar el mismo archivo de nuevo
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        capture={capture}
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
        className="hidden"
        aria-label="Seleccionar imagen"
      />
      <div onClick={handleClick} className={className}>
        {children || (
          <button
            type="button"
            disabled={disabled || isProcessing}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Procesando..." : "Seleccionar imagen"}
          </button>
        )}
      </div>
    </>
  );
}
