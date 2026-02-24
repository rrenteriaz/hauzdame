import { getDefaultTenant } from "@/lib/tenant";
import Link from "next/link";
import Page from "@/lib/ui/Page";
import HostWebContainer from "@/lib/ui/HostWebContainer";
import { safeReturnTo } from "@/lib/navigation/safeReturnTo";
import { listTenantVariantGroupsAction } from "./actions";
import CreateVariantGroupButton from "./CreateVariantGroupButton";

export default async function VariantGroupsPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const tenant = await getDefaultTenant();
  const params = searchParams ? await searchParams : {};
  const returnTo = safeReturnTo(params?.returnTo, "/host/menu");

  if (!tenant) {
    return (
      <Page title="Grupos de variantes" showBack backHref={returnTo}>
        <p className="text-neutral-600">No se encontró el tenant.</p>
      </Page>
    );
  }

  const groups = await listTenantVariantGroupsAction();

  return (
    <Page
      title="Grupos de variantes"
      subtitle="Define grupos reutilizables (ej. Tamaño de cama) para asociar a ítems"
      showBack
      backHref={returnTo}
    >
      <HostWebContainer className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-neutral-600">
            {groups.length} grupo{groups.length !== 1 ? "s" : ""}
          </p>
          <CreateVariantGroupButton />
        </div>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
            <p className="text-neutral-600 mb-4">
              No hay grupos de variantes. Crea uno para empezar.
            </p>
            <CreateVariantGroupButton />
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/host/catalog/variant-groups/${g.id}`}
                className="block rounded-lg border border-neutral-200 bg-white px-4 py-3 hover:bg-neutral-50 transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-neutral-900">{g.label}</span>
                    <span className="text-neutral-500 ml-2 text-sm">({g.key})</span>
                  </div>
                  <div className="text-sm text-neutral-500">
                    {g.optionCount} opciones · {g.itemCount} ítems
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </HostWebContainer>
    </Page>
  );
}
