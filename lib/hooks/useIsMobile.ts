"use client";

import { useState, useEffect } from "react";

/**
 * Hook para detectar si el viewport es mobile (< 768px)
 * Usa matchMedia para mejor rendimiento y estabilidad
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Verificar en cliente
    if (typeof window === "undefined") {
      return;
    }

    const mq = window.matchMedia("(max-width: 768px)");
    
    // Establecer valor inicial
    setIsMobile(mq.matches);

    // Escuchar cambios
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Agregar listener (modern browsers)
    if (mq.addEventListener) {
      mq.addEventListener("change", handleChange);
      return () => mq.removeEventListener("change", handleChange);
    } else {
      // Fallback para navegadores antiguos
      mq.addListener(handleChange);
      return () => mq.removeListener(handleChange);
    }
  }, []);

  return isMobile;
}

