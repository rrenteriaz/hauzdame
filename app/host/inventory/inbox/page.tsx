// app/host/inventory/inbox/page.tsx
import { notFound } from "next/navigation";
import { requireHostUser } from "@/lib/auth/requireUser";
import {
  getInventoryInboxItems,
  getInventoryInboxSummary,
} from "./actions";
import InventoryInboxClient from "./InventoryInboxClient";
import prisma from "@/lib/prisma";
import Page from "@/lib/ui/Page";

export default async function InventoryInboxPage({
  searchParams,
}: {
  searchParams?: Promise<{
    tab?: string;
    propertyId?: string;
    type?: string;
    severity?: string;
    dateRange?: string;
  }>;
}) {
  const user = await requireHostUser();
  const tenantId = user.tenantId;
  if (!tenantId) notFound();

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const tab = resolvedSearchParams.tab || "pending";
  const propertyId = resolvedSearchParams.propertyId;
  const type = resolvedSearchParams.type as "CHANGE" | "REPORT" | undefined;
  const severity = resolvedSearchParams.severity as
    | "URGENT"
    | "IMPORTANT"
    | "INFO"
    | undefined;
  const dateRange = resolvedSearchParams.dateRange as
    | "7d"
    | "30d"
    | "all"
    | undefined;

  const [summary, items, properties] = await Promise.all([
    getInventoryInboxSummary(),
    getInventoryInboxItems({
      propertyId,
      type,
      severity,
      status: tab === "pending" ? "PENDING" : "RESOLVED",
      dateRange: dateRange || "all",
    }),
    prisma.property.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        shortName: true,
      },
      orderBy: { shortName: "asc" },
    }),
  ]);

  return (
    <Page
      title="Inbox de inventario"
      subtitle="Revisa y resuelve cambios y reportes de inventario"
    >
      <InventoryInboxClient
        initialItems={items}
        summary={summary}
        properties={properties}
        initialTab={tab}
        initialFilters={{
          propertyId,
          type,
          severity,
          dateRange: dateRange || "all",
        }}
      />
    </Page>
  );
}

