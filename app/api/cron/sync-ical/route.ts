/**
 * GET /api/cron/sync-ical
 * Cron endpoint para sincronización automática iCal.
 * Requiere Authorization: Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { syncIcalForTenantBatch } from "@/lib/integrations/ical/sync";

const BATCH_SIZE =
  parseInt(process.env.ICAL_SYNC_BATCH_SIZE || "10", 10) || 10;

function getCronSecret(): string | null {
  return process.env.CRON_SECRET || null;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret || secret.trim() === "") return false;

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7).trim();
  return token === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const propertiesWithIcal = await prisma.property.findMany({
      where: {
        icalUrl: { not: null, gt: "" },
      },
      select: { tenantId: true },
      distinct: ["tenantId"],
    });

    const tenantIds = propertiesWithIcal.map((p) => p.tenantId);

    if (tenantIds.length === 0) {
      return NextResponse.json({
        ok: true,
        tenantsProcessed: 0,
        propertiesSynced: 0,
        skippedLocked: 0,
        skippedNotStale: 0,
        errors: 0,
      });
    }

    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    let propertiesSynced = 0;
    let skippedLocked = 0;
    let skippedNotStale = 0;
    let errors = 0;

    for (const tenant of tenants) {
      const result = await syncIcalForTenantBatch({
        tenantId: tenant.id,
        reason: "cron",
        limit: BATCH_SIZE,
      });
      propertiesSynced += result.synced;
      skippedLocked += result.skippedLocked;
      skippedNotStale += result.skippedNotStale;
      errors += result.errors;
    }

    return NextResponse.json({
      ok: true,
      tenantsProcessed: tenants.length,
      propertiesSynced,
      skippedLocked,
      skippedNotStale,
      errors,
    });
  } catch (err: any) {
    console.error("[cron/sync-ical] Error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
