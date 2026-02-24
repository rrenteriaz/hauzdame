// app/api/health/route.ts
import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Endpoint simple de health check
 * Retorna JSON con estado básico del servidor
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      now: new Date().toISOString(),
    },
    { status: 200 }
  );
}

