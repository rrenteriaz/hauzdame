// app/host/cleanings/[id]/CleaningWarningCard.tsx
import Link from "next/link";
import { CleaningAttentionReason } from "@/lib/cleaning-attention-reasons";

interface CleaningWarningCardProps {
  reasons: CleaningAttentionReason[];
  returnTo?: string | null;
  cleaningId: string; // ID de la limpieza actual para construir el returnTo correcto
}

function WarningSection({
  title,
  reasons,
  variant,
  returnTo,
  cleaningId,
}: {
  title: string;
  reasons: CleaningAttentionReason[];
  variant: "critical" | "warning";
  returnTo?: string | null;
  cleaningId: string;
}) {
  if (reasons.length === 0) return null;

  const primaryReason = reasons.find((r) => r.cta) || reasons[0];

  const styles =
    variant === "critical"
      ? {
          container: "border-amber-200 bg-amber-50",
          title: "text-amber-900",
          dot: "text-amber-600",
          icon: "text-amber-600",
          cta: "border-amber-300 text-amber-900 hover:bg-amber-50",
        }
      : {
          container: "border-neutral-200 bg-neutral-50",
          title: "text-neutral-900",
          dot: "text-neutral-500",
          icon: "text-neutral-500",
          cta: "border-neutral-300 text-neutral-800 hover:bg-neutral-100",
        };

  return (
    <section className={`rounded-2xl border ${styles.container} p-4 space-y-3`}>
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5">
          <svg
            className={`w-5 h-5 ${styles.icon}`}
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
          <h3 className={`text-base font-semibold ${styles.title} mb-1`}>
            {title}
          </h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className={`${styles.dot} shrink-0 mt-1`}>•</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${styles.title}`}>
                  {primaryReason.title}
                </p>
                {primaryReason.detail && (
                  <p className="text-sm text-neutral-600 mt-1">
                    {primaryReason.detail}
                  </p>
                )}
              </div>
            </li>
          </ul>
          {primaryReason.cta && (
            <div className="mt-3">
              <Link
                href={
                  returnTo
                    ? (() => {
                        // Construir el returnTo para el detalle de propiedad: debe regresar al detalle de limpieza actual
                        const cleaningDetailUrl = `/host/cleanings/${cleaningId}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
                        return `${primaryReason.cta.href}?returnTo=${encodeURIComponent(cleaningDetailUrl)}`;
                      })()
                    : primaryReason.cta.href
                }
                className={`inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium ${styles.cta} active:scale-[0.99] transition`}
              >
                <span>{primaryReason.cta.label}</span>
                <svg
                  className="w-4 h-4"
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
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function CleaningWarningCard({ reasons, returnTo, cleaningId }: CleaningWarningCardProps) {
  if (reasons.length === 0) {
    return null;
  }

  const criticalReasons = reasons.filter((r) => r.severity === "CRITICAL");
  const warningReasons = reasons.filter((r) => r.severity === "WARNING");

  return (
    <div className="space-y-3">
      <WarningSection
        title="Atención requerida"
        reasons={criticalReasons}
        variant="critical"
        returnTo={returnTo}
        cleaningId={cleaningId}
      />
      <WarningSection 
        title="Aviso" 
        reasons={warningReasons} 
        variant="warning"
        returnTo={returnTo}
        cleaningId={cleaningId}
      />
    </div>
  );
}

