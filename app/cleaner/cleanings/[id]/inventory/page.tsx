// app/cleaner/cleanings/[id]/inventory/page.tsx
import { notFound } from "next/navigation";
import { getInventoryForCleaning } from "@/app/cleaner/inventory/actions";
import { requireCleanerAccessToCleaning } from "@/lib/cleaner/requireCleanerAccessToCleaning";
import { validateRedirect } from "@/lib/auth/validateRedirect";
import Page from "@/lib/ui/Page";
import InventoryVerificationClient from "./InventoryVerificationClient";

export default async function CleanerInventoryVerificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ memberId?: string; returnTo?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  // Verificar acceso a la limpieza (lanza forbidden/notFound si no hay acceso)
  const access = await requireCleanerAccessToCleaning(resolvedParams.id);

  const { cleaning } = access;
  const property = cleaning.property;

  // Obtener inventario con checks
  const inventoryData = await getInventoryForCleaning(cleaning.id);

  const defaultReturn = `/cleaner/cleanings/${cleaning.id}`;
  const returnTo =
    validateRedirect(resolvedSearchParams?.returnTo, ["/cleaner"]) ?? defaultReturn;

  return (
    <Page
      title="Verificar inventario"
      subtitle={property.shortName || property.name}
      showBack
      backHref={returnTo}
    >
      <InventoryVerificationClient
        cleaningId={cleaning.id}
        inventoryData={inventoryData}
      />
    </Page>
  );
}

