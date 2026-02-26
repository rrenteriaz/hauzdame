// app/host/actividad/limpiezas/hoy/page.tsx
import { requireHostUser } from "@/lib/auth/requireUser";
import { getAllTodayCleanings } from "@/app/host/hoy/data";
import Page from "@/lib/ui/Page";
import PageHeader from "@/lib/ui/PageHeader";
import ListContainer from "@/lib/ui/ListContainer";
import ListRow from "@/lib/ui/ListRow";
import Link from "next/link";
import { safeReturnTo } from "@/lib/navigation/safeReturnTo";

export default async function LimpiezasHoyPage({
  searchParams,
}: {
  searchParams?: Promise<{ propertyId?: string; from?: string; returnTo?: string }>;
}) {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) throw new Error("Usuario sin tenant asociado");

  const params = searchParams ? await searchParams : {};
  const propertyId = params?.propertyId;
  const returnToInput = params?.returnTo || params?.from;
  const returnTo = safeReturnTo(returnToInput, "/host/hoy");

  const items = await getAllTodayCleanings(tenantId, propertyId);

  // Construir URL de retorno para esta vista (para que los detalles vuelvan aquí)
  // Round-trip seguro: conservar returnTo y from si existen
  const currentViewParams = new URLSearchParams();
  if (propertyId) {
    currentViewParams.set("propertyId", propertyId);
  }
  if (params?.returnTo) {
    currentViewParams.set("returnTo", params.returnTo);
  }
  if (params?.from) {
    currentViewParams.set("from", params.from);
  }
  const currentViewUrl = `/host/actividad/limpiezas/hoy${currentViewParams.toString() ? `?${currentViewParams.toString()}` : ""}`;

  return (
    <Page title="Limpiezas de hoy" showBack backHref={returnTo}>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <p className="text-base text-neutral-600">No hay resultados.</p>
        </div>
      ) : (
        <ListContainer>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const dateObj = new Date(item.date || "");
            const hasTime = dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0;
            
            // Construir href con returnTo apuntando a esta vista dedicada
            const detailParams = new URLSearchParams();
            detailParams.set("returnTo", currentViewUrl);
            if (propertyId) {
              detailParams.set("propertyId", propertyId);
            }
            const detailHref = `/host/cleanings/${item.id}?${detailParams.toString()}`;

            return (
              <ListRow
                key={item.id}
                href={detailHref}
                isLast={isLast}
                ariaLabel={`Ver detalles de limpieza ${item.propertyName}`}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-medium text-neutral-900 truncate">
                    {item.propertyName}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {dateObj.toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
                    })}
                  </p>
                </div>
              </ListRow>
            );
          })}
        </ListContainer>
      )}
    </Page>
  );
}

