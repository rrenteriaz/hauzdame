"use client";

import { useEffect } from "react";

/**
 * Bloquea el scroll del body/html en páginas de mensajes para prevenir
 * que el teclado virtual empuje el header fuera de la vista.
 * Solo el área de mensajes debe hacer scroll, no el body completo.
 * 
 * Estrategia: usar overflow:hidden en lugar de position:fixed para evitar
 * problemas con scrollY y offsets. El viewport dinámico se maneja con --app-vh.
 */
export function ChatPageViewport() {
  useEffect(() => {
    // Guardar estilos originales
    const originalHtmlHeight = document.documentElement.style.height;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyHeight = document.body.style.height;
    const originalBodyOverflow = document.body.style.overflow;

    // Bloquear scroll del body/html sin position:fixed (evita problemas con scrollY)
    document.documentElement.style.height = "100%";
    document.documentElement.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";

    // Manejar viewport dinámico si está disponible (para teclado virtual)
    let viewportHandler: ((e: Event) => void) | null = null;
    if (typeof window !== "undefined" && window.visualViewport) {
      const updateViewport = () => {
        const vh = window.visualViewport!.height * 0.01;
        document.documentElement.style.setProperty("--app-vh", `${vh}px`);
      };
      
      updateViewport();
      window.visualViewport.addEventListener("resize", updateViewport);
      viewportHandler = updateViewport;
    }

    // Cleanup: restaurar estilos originales al desmontar
    return () => {
      document.documentElement.style.height = originalHtmlHeight;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.height = originalBodyHeight;
      document.body.style.overflow = originalBodyOverflow;
      
      if (viewportHandler && window.visualViewport) {
        window.visualViewport.removeEventListener("resize", viewportHandler);
      }
      
      document.documentElement.style.removeProperty("--app-vh");
    };
  }, []);

  return null;
}

