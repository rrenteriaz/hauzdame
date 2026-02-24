// components/debug/DebugPanel.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { getPersistedLogs, clearPersistedLogs } from "@/lib/debug/persistLog";
import { getChatDebug } from "@/lib/utils/chatDebug";

export function DebugPanel() {
  // Flag de debug reactivo (se actualiza cuando cambia la URL)
  const [chatDebug, setChatDebug] = useState(() => getChatDebug());
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Actualizar flag de debug cuando cambia la URL
  useEffect(() => {
    const updateDebugFlag = () => {
      setChatDebug(getChatDebug());
    };
    
    updateDebugFlag();
    window.addEventListener("popstate", updateDebugFlag);
    
    return () => {
      window.removeEventListener("popstate", updateDebugFlag);
    };
  }, []);

  const loadLogs = useCallback(() => {
    setLogs(getPersistedLogs());
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
      // Refrescar logs cada segundo cuando está abierto
      const interval = setInterval(loadLogs, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadLogs]);

  const handleCopy = () => {
    const text = logs.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      alert("Logs copiados al portapapeles");
    }).catch((err) => {
      console.error("Error copiando logs:", err);
    });
  };

  const handleClear = () => {
    if (confirm("¿Limpiar todos los logs?")) {
      clearPersistedLogs();
      setLogs([]);
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold hover:bg-red-700"
        title="Debug Panel"
      >
        DBG
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] max-h-[60vh] bg-white border-2 border-red-600 rounded-lg shadow-2xl flex flex-col">
          {/* Header */}
          <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between">
            <h3 className="font-bold text-sm">Debug Logs ({logs.length})</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-red-200"
            >
              ✕
            </button>
          </div>

          {/* Logs */}
          <div className="flex-1 overflow-y-auto p-2 bg-black text-green-400 text-xs font-mono">
            {logs.length === 0 ? (
              <div className="text-gray-500">No hay logs aún</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="mb-1 break-words">
                  {log}
                </div>
              ))
            )}
          </div>

          {/* Footer con botones */}
          <div className="border-t border-gray-300 p-2 flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Copy
            </button>
            <button
              onClick={handleClear}
              className="flex-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Clear
            </button>
            <button
              onClick={loadLogs}
              className="flex-1 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </>
  );
}

