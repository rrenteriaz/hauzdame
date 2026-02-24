import Link from "next/link";

interface CleaningHistoryProps {
  cleanings: any[];
  propertyId: string;
  returnTo: string;
}

export default function CleaningHistory({ cleanings, propertyId, returnTo }: CleaningHistoryProps) {
  // Usar el returnTo recibido directamente (ya validado con safeReturnTo)
  // MUST: No forzar returnTo auto-referencial; debe apuntar a la lista /host/properties
  const historyHref = `/host/properties/${propertyId}/history?returnTo=${encodeURIComponent(returnTo)}`;
  const count = cleanings.length;

  return (
    <Link
      href={historyHref}
      className="flex items-center justify-between py-2 group hover:opacity-80 transition-opacity"
    >
      <h2 className="text-base font-semibold text-neutral-800">
        Historial de limpiezas{count > 0 ? ` (${count})` : ""}
      </h2>
      <svg
        className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </Link>
  );
}

