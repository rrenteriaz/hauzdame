"use client";

import { useState } from "react";
import { syncIcalAllProperties } from "./sync-ical";

const SYNC_INTERVAL_MINUTES = 5;

export default function SyncAllIcalButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<{
    synced: number;
    skippedLocked: number;
    skippedNotStale: number;
    errors: number;
    errorsDetails?: Array<{
      propertyId: string;
      propertyName: string;
      error: string;
    }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSyncAll = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setResult(null);
    setError(null);

    try {
      const syncResult = await syncIcalAllProperties();
      setResult(syncResult);
    } catch (err: any) {
      setError(err.message || "Error desconocido al sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500">
        La sincronización ocurre automáticamente cada {SYNC_INTERVAL_MINUTES} minutos.
      </p>

      <button
        type="button"
        onClick={handleSyncAll}
        disabled={isSyncing}
        className="w-full rounded-lg bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSyncing ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Sincronizando...</span>
          </>
        ) : (
          <span>Forzar sincronización</span>
        )}
      </button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-900">Error</p>
          <p className="text-xs text-red-700 mt-1">{error}</p>
        </div>
      )}

      {result && (
        <div
          className={`rounded-xl border p-3 space-y-2 ${
            result.errors > 0
              ? "border-amber-200 bg-amber-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <p
            className={`text-xs font-semibold ${
              result.errors > 0 ? "text-amber-900" : "text-green-900"
            }`}
          >
            Sincronización completada
          </p>
          <div className="text-xs space-y-1">
            <p className={result.synced > 0 ? "text-green-700" : "text-neutral-600"}>
              ✓ Sincronizadas: <span className="font-medium">{result.synced}</span>
            </p>
            {result.skippedLocked > 0 && (
              <p className="text-neutral-600">
                Omitidas (en progreso): <span className="font-medium">{result.skippedLocked}</span>
              </p>
            )}
            {result.skippedNotStale > 0 && (
              <p className="text-neutral-600">
                Omitidas (actualizadas): <span className="font-medium">{result.skippedNotStale}</span>
              </p>
            )}
            {result.errors > 0 && (
              <p className="text-amber-700">
                ✗ Con error: <span className="font-medium">{result.errors}</span>
              </p>
            )}
          </div>

          {result.errorsDetails && result.errorsDetails.length > 0 && (
            <div className="mt-2 pt-2 border-t border-amber-200 space-y-1">
              <p className="text-xs font-medium text-amber-800">
                Propiedades con error:
              </p>
              {result.errorsDetails.map((r, idx) => (
                <p key={idx} className="text-xs text-amber-700 pl-2 break-words">
                  • <span className="font-medium">{r.propertyName}</span>
                  {r.error && `: ${r.error}`}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
