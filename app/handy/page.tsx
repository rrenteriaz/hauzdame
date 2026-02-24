// app/handy/page.tsx
import Page from "@/lib/ui/Page";

// Mock data para UI (sin modelo real aún)
const MOCK_STATS = {
  pending: 3,
  scheduled: 8,
  completed: 12,
};

export default function HandyPage() {
  return (
    <Page title="Hoy">
      {/* Resumen con indicadores */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-3">
          <p className="text-xs text-neutral-500 mb-1">Pendientes</p>
          <p className="text-2xl font-semibold text-neutral-900">{MOCK_STATS.pending}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5">Requieren atención</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-3">
          <p className="text-xs text-neutral-500 mb-1">Programadas</p>
          <p className="text-2xl font-semibold text-neutral-900">{MOCK_STATS.scheduled}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5">En calendario</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-3">
          <p className="text-xs text-neutral-500 mb-1">Completadas</p>
          <p className="text-2xl font-semibold text-neutral-900">{MOCK_STATS.completed}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5">Este mes</p>
        </div>
      </section>

      {/* Placeholder para contenido futuro */}
      <section className="mt-6">
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-center text-base text-neutral-600">
          Portal Handy - En desarrollo
          <br />
          <span className="text-xs text-neutral-500">
            El sistema de tickets y órdenes de trabajo se integrará próximamente.
          </span>
        </div>
      </section>
    </Page>
  );
}

