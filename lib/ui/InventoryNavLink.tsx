// lib/ui/InventoryNavLink.tsx
import Link from "next/link";
import { getInventoryInboxSummary } from "@/app/host/inventory/inbox/actions";

export default async function InventoryNavLink() {
  const summary = await getInventoryInboxSummary();

  return (
    <Link
      href="/host/inventory/inbox"
      className="hover:text-black whitespace-nowrap relative"
    >
      Inventario
      {summary.totalPendings > 0 && (
        <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-medium">
          {summary.totalPendings}
        </span>
      )}
    </Link>
  );
}

