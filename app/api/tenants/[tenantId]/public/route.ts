// app/api/tenants/[tenantId]/public/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/tenants/[tenantId]/public
 * Obtener información pública de un tenant (Owner Card)
 * NO incluye datos privados: teléfono, correo, dirección, lista de propiedades
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const resolvedParams = await params;
    const tenantId = resolvedParams.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true, // displayName
        createdAt: true, // memberSince
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    // Contar propiedades activas
    const propertiesCount = await prisma.property.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    // Calcular rating (promedio de reviews de trabajos completados)
    // Por ahora, usar fallback "Nuevo" si no hay reviews
    // TODO: Implementar cuando exista tabla de reviews
    const rating = null; // Fallback a "Nuevo" en UI

    return NextResponse.json({
      displayName: tenant.name,
      rating,
      memberSince: tenant.createdAt,
      propertiesCount,
    });
  } catch (error: any) {
    console.error("Error obteniendo tenant público:", error);
    return NextResponse.json(
      { error: error.message || "Error obteniendo información" },
      { status: 500 }
    );
  }
}

