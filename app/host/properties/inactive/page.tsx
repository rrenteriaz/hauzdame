// app/host/properties/inactive/page.tsx
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireHostUser } from "@/lib/auth/requireUser";
import Page from "@/lib/ui/Page";
import ListContainer from "@/lib/ui/ListContainer";
import ListRow from "@/lib/ui/ListRow";
import ListThumb from "@/lib/ui/ListThumb";
import { getCoverThumbUrlsBatch } from "@/lib/media/getCoverThumbUrl";

export default async function InactivePropertiesPage() {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) throw new Error("Usuario sin tenant asociado");

  const properties = await prisma.property.findMany({
    where: { 
      tenantId,
      ...({ isActive: false } as any), // Solo propiedades inactivas - Temporal hasta que TypeScript reconozca el campo
    },
    select: {
      id: true,
      name: true,
      shortName: true,
      address: true,
      icalUrl: true,
      coverAssetGroupId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Obtener thumbnails en batch
  const thumbUrls = await getCoverThumbUrlsBatch(
    properties.map((p) => ({ id: p.id, coverAssetGroupId: (p as any).coverAssetGroupId || null }))
  );

  // Helper para construir returnTo
  const buildReturnTo = () => "/host/properties/inactive";

  return (
    <Page
      showBack
      backHref="/host/properties"
      title="Propiedades inactivas"
      subtitle="Propiedades que han sido inactivadas. No generan actividades futuras pero conservan sus datos históricos."
    >
      {properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-center text-base text-neutral-600">
          No hay propiedades inactivas.
          <br />
          <Link
            href="/host/properties"
            className="text-neutral-900 underline underline-offset-2 mt-2 inline-block"
          >
            Ver propiedades activas
          </Link>
        </div>
      ) : (
        <ListContainer>
          {properties.map((p, index) => {
            const returnTo = buildReturnTo();
            const detailsHref = `/host/properties/${p.id}?returnTo=${encodeURIComponent(returnTo)}`;
            const isLast = index === properties.length - 1;
            
            return (
              <ListRow
                key={p.id}
                href={detailsHref}
                isLast={isLast}
                ariaLabel={`Ver detalles de propiedad ${p.name}`}
                className="opacity-60"
              >
                <ListThumb src={thumbUrls.get(p.id) || null} alt={p.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-medium text-neutral-900 truncate">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Inactiva
                      </span>
                      {p.shortName && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                          {p.shortName}
                        </span>
                      )}
                    </div>
                  </div>
                  {p.address && (
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {p.address}
                    </p>
                  )}
                  {p.icalUrl ? (
                    <p className="text-[11px] text-emerald-600 mt-0.5">
                      iCal conectado
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-600 mt-0.5">
                      iCal no configurado
                    </p>
                  )}
                </div>
              </ListRow>
            );
          })}
        </ListContainer>
      )}
    </Page>
  );
}

