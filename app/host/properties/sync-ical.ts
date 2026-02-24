/**
 * Server Actions para sincronización iCal.
 * Delegan en lib/integrations/ical/sync.ts.
 */

"use server";

import { requireHostUser } from "@/lib/auth/requireUser";
import { revalidatePath } from "next/cache";
import {
  syncIcalForProperty as syncIcalForPropertyService,
  syncIcalForTenantBatch,
} from "@/lib/integrations/ical/sync";

/** Resultado para el botón por propiedad */
export type SyncIcalForPropertyResult = {
  ok: boolean;
  skippedLock?: boolean;
  error?: string;
};

export async function syncIcalForProperty(
  propertyId: string
): Promise<SyncIcalForPropertyResult> {
  const user = await requireHostUser();
  const { tenantId } = user;

  const result = await syncIcalForPropertyService({
    tenantId,
    propertyId,
    reason: "manual",
    requestedBy: user.id,
  });

  if (result.skippedLock) {
    return {
      ok: false,
      skippedLock: true,
      error: "Sincronización en progreso, intenta en unos minutos.",
    };
  }

  revalidatePath("/host/properties");
  revalidatePath(`/host/properties/${propertyId}`);
  revalidatePath("/host/cleanings");

  return {
    ok: result.ok,
    error: result.error,
  };
}

/** Resultado para el botón global (bulk) */
export type SyncIcalAllPropertiesResult = {
  synced: number;
  skippedLocked: number;
  skippedNotStale: number;
  errors: number;
  errorsDetails?: Array<{
    propertyId: string;
    propertyName: string;
    error: string;
  }>;
};

export async function syncIcalAllProperties(): Promise<SyncIcalAllPropertiesResult> {
  const user = await requireHostUser();
  const { tenantId } = user;

  const limit =
    parseInt(process.env.ICAL_SYNC_BATCH_SIZE || "10", 10) || 10;

  const result = await syncIcalForTenantBatch({
    tenantId,
    reason: "bulk",
    limit,
  });

  revalidatePath("/host/properties");
  revalidatePath("/host/cleanings");

  return result;
}
