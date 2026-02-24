// app/host/locks/page.tsx
import Page from "@/lib/ui/Page";

export default function LocksPage() {
  return (
    <Page title="Cerraduras">
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">
          Cerraduras (próximamente)
        </h2>
        <p className="text-base text-neutral-600">
          Aquí podrás gestionar accesos y códigos.
        </p>
      </div>
    </Page>
  );
}

