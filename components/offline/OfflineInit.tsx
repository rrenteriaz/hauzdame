// components/offline/OfflineInit.tsx
"use client";

import { useEffect } from "react";
import { initOffline } from "@/lib/offline/init";

/**
 * Componente que inicializa el sistema offline al montar
 * Debe incluirse en el layout principal
 */
export function OfflineInit() {
  useEffect(() => {
    initOffline();
  }, []);

  return null;
}

