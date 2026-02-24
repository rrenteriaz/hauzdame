// app/host/cleanings/[id]/inventory-review/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";
import { getInventoryReview, getActiveInventoryLines } from "@/app/host/inventory-review/actions";
import InventoryReviewScreen from "./InventoryReviewScreen";

export default async function InventoryReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await getDefaultTenant();
  if (!tenant) notFound();

  const resolvedParams = await params;
  const cleaningId = resolvedParams.id;

  // Verificar que la limpieza existe
  const cleaning = await prisma.cleaning.findUnique({
    where: { id: cleaningId },
    select: { id: true, propertyId: true, tenantId: true },
  });

  if (!cleaning || cleaning.tenantId !== tenant.id) {
    notFound();
  }

  // Obtener la revisión existente (si existe) y las líneas de inventario activas
  const [review, inventoryLines] = await Promise.all([
    getInventoryReview(cleaningId),
    getActiveInventoryLines(cleaning.propertyId),
  ]);

  // Permitir crear revisión incluso si no hay items (para limpiezas previas al inventario)
  // El Cleaner puede presionar "Todo en orden" para crear una revisión vacía
  return (
    <InventoryReviewScreen
      cleaningId={cleaningId}
      propertyId={cleaning.propertyId}
      initialReview={review}
      inventoryLines={(inventoryLines || []).map((line: any) => ({
        id: line.id,
        area: line.area,
        expectedQty: line.expectedQty,
        variantKey: line.variantKey,
        variantValue: line.variantValue,
        item: {
          id: line.item.id,
          name: line.item.name,
          category: line.item.category,
        },
        allLines: line.allLines || [],
      }))}
    />
  );
}
