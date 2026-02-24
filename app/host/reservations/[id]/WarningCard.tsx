// app/host/reservations/[id]/WarningCard.tsx
import { AttentionReason } from "@/lib/reservation-attention-reasons";

interface WarningCardProps {
  reasons: AttentionReason[];
}

export default function WarningCard({ reasons }: WarningCardProps) {
  if (reasons.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5">
          <svg
            className="w-5 h-5 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-amber-900 mb-1">
            Atención requerida
          </h3>
          <ul className="space-y-2">
            {reasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-amber-600 mt-1.5 shrink-0">•</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-900">
                    {reason.title}
                  </p>
                  {reason.detail && (
                    <p className="text-xs text-amber-700 mt-0.5">
                      {reason.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

