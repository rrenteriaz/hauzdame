// lib/offline/init.ts
/**
 * Inicialización del sistema offline
 * - Purga mensajes antiguos
 * - Inicia sync loop si está online
 */

import { purgeOldMessages, getLastPurgeAt, setLastPurgeAt } from "./chatCache";
import { startSyncLoop } from "./sync";

const PURGE_INTERVAL_DAYS = 1; // Purga una vez al día

export async function initOffline() {
  try {
    // Verificar si necesitamos purgar
    const lastPurge = await getLastPurgeAt();
    const now = new Date();
    const shouldPurge = !lastPurge || 
      (now.getTime() - new Date(lastPurge).getTime()) > (PURGE_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

    if (shouldPurge) {
      await purgeOldMessages(15);
      await setLastPurgeAt(now.toISOString());
    }

    // Iniciar sync loop si está online
    if (typeof window !== "undefined" && navigator.onLine) {
      startSyncLoop();
    }
  } catch (error) {
    console.error("[Offline Init] Error:", error);
  }
}

