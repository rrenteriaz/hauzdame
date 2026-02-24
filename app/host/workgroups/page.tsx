// app/host/workgroups/page.tsx
import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";
import Link from "next/link";
import CreateWorkGroupForm from "./CreateWorkGroupForm";
import WorkGroupActions from "./WorkGroupActions";
import Page from "@/lib/ui/Page";
import ListContainer from "@/lib/ui/ListContainer";
import ListThumb from "@/lib/ui/ListThumb";
import StopPropagationDiv from "@/lib/ui/StopPropagationDiv";
import { safeReturnTo } from "@/lib/navigation/safeReturnTo";

export default async function WorkGroupsPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const tenant = await getDefaultTenant();
  const params = searchParams ? await searchParams : {};
  const returnTo = safeReturnTo(params?.returnTo, "/host/menu");

  if (!tenant) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Configura tu cuenta</h1>
        <p className="text-base text-neutral-600">
          No se encontró ningún tenant. Crea uno en Prisma Studio para continuar.
        </p>
      </div>
    );
  }

  const workGroups = await prisma.hostWorkGroup.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Obtener conteos de propiedades y ejecutores por workGroup
  const workGroupIds = workGroups.map((wg) => wg.id);
  
  const [propertiesCounts, executorsCounts] = await Promise.all([
    prisma.hostWorkGroupProperty.groupBy({
      by: ["workGroupId"],
      where: {
        workGroupId: { in: workGroupIds },
      },
      _count: {
        id: true,
      },
    }),
    prisma.workGroupExecutor.groupBy({
      by: ["workGroupId"],
      where: {
        workGroupId: { in: workGroupIds },
        status: "ACTIVE",
      },
      _count: {
        id: true,
      },
    }),
  ]);

  const propertiesCountMap = new Map(
    propertiesCounts.map((item) => [item.workGroupId, item._count.id])
  );
  const executorsCountMap = new Map(
    executorsCounts.map((item) => [item.workGroupId, item._count.id])
  );

  return (
    <Page title="Grupos de trabajo" subtitle="Gestiona los grupos de trabajo y sus asignaciones a propiedades" showBack backHref={returnTo}>
      <div className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-neutral-800">
            Tus grupos de trabajo
          </h2>

          {workGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-center text-base text-neutral-600">
              Todavía no has creado ningún grupo de trabajo.
              <br />
              Usa el botón &quot;Crear grupo de trabajo&quot; para agregar el primero.
            </div>
          ) : (
            <ListContainer>
              {workGroups.map((workGroup, index) => {
                const detailsHref = `/host/workgroups/${workGroup.id}`;
                const propertiesCount = propertiesCountMap.get(workGroup.id) || 0;
                const executorsCount = executorsCountMap.get(workGroup.id) || 0;
                const isLast = index === workGroups.length - 1;

                return (
                  <div
                    key={workGroup.id}
                    className={`relative ${!isLast ? "border-b border-neutral-200" : ""}`}
                  >
                    <Link
                      href={detailsHref}
                      className={`
                        flex items-center gap-3
                        py-3 px-3 sm:px-4 pr-24
                        hover:bg-neutral-50
                        active:opacity-95
                        focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-inset
                        transition-colors
                      `.trim()}
                      aria-label={`Ver detalles del grupo de trabajo ${workGroup.name}`}
                    >
                      <ListThumb src={null} alt={workGroup.name} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-medium text-neutral-900 truncate">
                          {workGroup.name}
                        </h3>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                          {propertiesCount} {propertiesCount === 1 ? "propiedad" : "propiedades"}
                          {executorsCount > 0 && (
                            <span className="text-neutral-400">
                              {" "}· {executorsCount} ejecutor{executorsCount !== 1 ? "es" : ""}
                            </span>
                          )}
                        </p>
                      </div>
                    </Link>
                    <StopPropagationDiv className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                      <WorkGroupActions
                        workGroup={workGroup}
                        hasProperties={propertiesCount > 0}
                        hasExecutors={executorsCount > 0}
                        returnTo={returnTo}
                      />
                    </StopPropagationDiv>
                  </div>
                );
              })}
            </ListContainer>
          )}

          <div className="flex justify-end">
            <CreateWorkGroupForm />
          </div>
        </section>
      </div>
    </Page>
  );
}

