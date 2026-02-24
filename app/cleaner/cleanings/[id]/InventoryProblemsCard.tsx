"use client";

import Link from "next/link";
import { getInventoryProblemsSummary } from "@/app/cleaner/inventory/actions";
import { useEffect, useState } from "react";

interface InventoryProblemsCardProps {
  cleaningId: string;
  returnTo?: string;
}

export default function InventoryProblemsCard({
  cleaningId,
  returnTo,
}: InventoryProblemsCardProps) {
  const [summary, setSummary] = useState<{
    total: number;
    missing: number;
    damaged: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInventoryProblemsSummary(cleaningId)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cleaningId]);

  if (loading || !summary) {
    return null;
  }

  if (summary.total === 0) {
    return null;
  }

  const inventoryHref = `/cleaner/cleanings/${cleaningId}/inventory${
    returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""
  }`;

  return (
    <Link
      href={inventoryHref}
      className="block rounded-xl border-2 border-red-200 bg-red-50 p-4 hover:bg-red-100 transition"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🟥</span>
            <span className="font-semibold text-red-900">Problemas detectados</span>
          </div>
          <p className="text-sm text-red-700">
            {summary.missing > 0 && `${summary.missing} falta${summary.missing > 1 ? "n" : ""}`}
            {summary.missing > 0 && summary.damaged > 0 && " · "}
            {summary.damaged > 0 && `${summary.damaged} dañado${summary.damaged > 1 ? "s" : ""}`}
          </p>
        </div>
        <span className="text-red-600">→</span>
      </div>
    </Link>
  );
}

