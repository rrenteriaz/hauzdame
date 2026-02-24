// app/handy/profile/page.tsx
import Page from "@/lib/ui/Page";

export default function HandyProfilePage() {
  return (
    <Page title="Perfil">
      <div className="space-y-6">
        {/* Información del usuario */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
          <div>
            <p className="text-xs text-neutral-500">Nombre</p>
            <p className="text-base font-medium text-neutral-900 mt-0.5">
              Usuario Handy
            </p>
          </div>
          
          <div>
            <p className="text-xs text-neutral-500">Email</p>
            <p className="text-base font-medium text-neutral-900 mt-0.5">
              usuario@handy.example
            </p>
          </div>
        </section>
        
        {/* Cerrar sesión */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <button
            type="button"
            className="w-full text-left text-base text-red-600 hover:text-red-700 font-medium"
          >
            Cerrar sesión
          </button>
          <p className="text-xs text-neutral-500 mt-2">
            Portal Handy - Autenticación pendiente de implementación.
          </p>
        </section>
      </div>
    </Page>
  );
}

