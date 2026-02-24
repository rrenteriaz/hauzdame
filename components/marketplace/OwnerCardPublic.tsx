// components/marketplace/OwnerCardPublic.tsx
"use client";

import { useEffect, useState } from "react";

interface OwnerCardPublicProps {
  tenantId: string;
  compact?: boolean;
}

interface TenantPublicData {
  displayName: string;
  rating: number | null;
  memberSince: string;
  propertiesCount: number;
}

export function OwnerCardPublic({ tenantId, compact = false }: OwnerCardPublicProps) {
  const [data, setData] = useState<TenantPublicData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tenants/${tenantId}/public`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
      })
      .catch((error) => {
        console.error("Error cargando Owner Card:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tenantId]);

  if (loading) {
    return (
      <div className="text-sm text-neutral-500">
        {compact ? "Cargando..." : "Cargando información..."}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const memberSinceYear = new Date(data.memberSince).getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsActive = currentYear - memberSinceYear;

  if (compact) {
    return (
      <div className="text-sm text-neutral-600">
        <div className="font-medium">{data.displayName}</div>
        <div className="text-xs text-neutral-500">
          {data.rating ? `⭐ ${data.rating.toFixed(1)}` : "Nuevo"} • {data.propertiesCount} alojamientos
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-full bg-neutral-200 flex items-center justify-center text-lg font-semibold text-neutral-600">
          {data.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-neutral-900 mb-1">{data.displayName}</h3>
          <div className="space-y-1 text-sm text-neutral-600">
            {data.rating ? (
              <div className="flex items-center gap-1">
                <span>⭐</span>
                <span>{data.rating.toFixed(1)}</span>
                <span className="text-neutral-500">(basado en trabajos completados)</span>
              </div>
            ) : (
              <div className="text-neutral-500">Nuevo en la plataforma</div>
            )}
            <div>
              Miembro desde {memberSinceYear}
              {yearsActive > 0 && ` (${yearsActive} ${yearsActive === 1 ? "año" : "años"})`}
            </div>
            <div>{data.propertiesCount} alojamiento{data.propertiesCount !== 1 ? "s" : ""}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

