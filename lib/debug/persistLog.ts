// lib/debug/persistLog.ts
/**
 * Sistema de logging persistente para debugging en desarrollo
 * Los logs se guardan en localStorage y persisten entre recargas
 */

const STORAGE_KEY = "__chat_dbg";
const MAX_ENTRIES = 200;

function getLogs(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as string[];
  } catch (error) {
    console.warn("[persistLog] Error reading logs:", error);
    return [];
  }
}

function saveLogs(logs: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  
  try {
    // Mantener solo los últimos MAX_ENTRIES
    const trimmed = logs.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn("[persistLog] Error saving logs:", error);
  }
}

/**
 * Debug log persistente
 * - Loguea en consola
 * - Guarda en localStorage para persistir entre recargas
 */
export function dbg(...args: any[]): void {
  // Solo en desarrollo
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const timestamp = new Date().toISOString();
  const message = args.map(arg => {
    if (typeof arg === "object") {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(" ");

  const logEntry = `[${timestamp}] ${message}`;

  // Log en consola
  console.log(...args);

  // Guardar en localStorage
  const logs = getLogs();
  logs.push(logEntry);
  saveLogs(logs);
}

/**
 * Obtener todos los logs guardados
 */
export function getPersistedLogs(): string[] {
  return getLogs();
}

/**
 * Limpiar todos los logs guardados
 */
export function clearPersistedLogs(): void {
  if (typeof window === "undefined") {
    return;
  }
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[persistLog] Error clearing logs:", error);
  }
}

