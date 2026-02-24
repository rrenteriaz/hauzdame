// app/api/openings/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { canManageOpening } from "@/lib/auth/guards";
import { createId } from "@paralleldrive/cuid2";

/**
 * POST /api/openings
 * Crear una bandera de trabajo (opening) para una propiedad
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json();
    const { propertyId, workType = "CLEANING", zoneLabel, notes } = body;

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId es requerido" }, { status: 400 });
    }

    // Validar permisos: solo Owner/Admin con acceso a la propiedad
    const canManage = await canManageOpening(user, propertyId);
    if (!canManage) {
      return NextResponse.json(
        { error: "No tienes permisos para crear openings en esta propiedad" },
        { status: 403 }
      );
    }

    // Verificar que la propiedad pertenece al mismo tenant
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        tenantId: user.tenantId,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Propiedad no encontrada" },
        { status: 404 }
      );
    }

    // Crear opening dentro de transacción para evitar race conditions
    const opening = await prisma.$transaction(async (tx) => {
      // Verificar que no haya otra opening ACTIVE (dentro de transacción)
      const existingActive = await (tx as any).propertyOpening.findFirst({
        where: {
          propertyId,
          workType,
          status: "ACTIVE",
          tenantId: user.tenantId,
        },
      });

      if (existingActive) {
        throw new Error("Ya existe una bandera activa para esta propiedad y tipo de trabajo");
      }

      // Crear opening
      return await (tx as any).propertyOpening.create({
        data: {
          id: createId(),
          tenantId: user.tenantId,
          propertyId,
          workType,
          status: "ACTIVE",
          zoneLabel: zoneLabel || null,
          notes: notes || null,
          createdByUserId: user.id,
        },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              shortName: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ opening }, { status: 201 });
  } catch (error: any) {
    console.error("Error creando opening:", error);
    return NextResponse.json(
      { error: error.message || "Error creando bandera" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/openings
 * Pausar, cerrar o reactivar una opening
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json();
    const { openingId, status } = body;

    if (!openingId || !status) {
      return NextResponse.json(
        { error: "openingId y status son requeridos" },
        { status: 400 }
      );
    }

    // Permitir cambiar a PAUSED, CLOSED o ACTIVE (para reactivar)
    if (!["PAUSED", "CLOSED", "ACTIVE"].includes(status)) {
      return NextResponse.json(
        { error: "status debe ser PAUSED, CLOSED o ACTIVE" },
        { status: 400 }
      );
    }

    // Obtener opening y validar tenant
    const opening = await (prisma as any).propertyOpening.findFirst({
      where: {
        id: openingId,
        tenantId: user.tenantId,
      },
    });

    if (!opening) {
      return NextResponse.json(
        { error: "Opening no encontrada" },
        { status: 404 }
      );
    }

    // Validar permisos
    const canManage = await canManageOpening(user, opening.propertyId);
    if (!canManage) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar esta opening" },
        { status: 403 }
      );
    }

    // Si se está activando, verificar que no haya otra ACTIVE para la misma propiedad
    if (status === "ACTIVE") {
      const existingActive = await (prisma as any).propertyOpening.findFirst({
        where: {
          propertyId: opening.propertyId,
          workType: opening.workType,
          status: "ACTIVE",
          tenantId: user.tenantId,
          id: { not: openingId }, // Excluir la opening actual
        },
      });

      if (existingActive) {
        return NextResponse.json(
          { error: "Ya existe una bandera activa para esta propiedad y tipo de trabajo" },
          { status: 400 }
        );
      }
    }

    // Actualizar opening
    const updated = await (prisma as any).propertyOpening.update({
      where: {
        id: openingId,
      },
      data: {
        status,
      },
    });

    return NextResponse.json({ opening: updated });
  } catch (error: any) {
    console.error("Error actualizando opening:", error);
    return NextResponse.json(
      { error: error.message || "Error actualizando bandera" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/openings
 * Listar openings disponibles
 * - Para Cleaner: solo ACTIVE, sin datos privados
 * - Para Host: todas las del tenant con filtro opcional por propertyId
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const searchParams = req.nextUrl.searchParams;
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status") || (user.role === "CLEANER" ? "ACTIVE" : undefined);
    const zoneFilter = searchParams.get("zone"); // Filtro por zona/ciudad

    console.log("[DEBUG Openings GET] User:", {
      id: user.id,
      role: user.role,
      tenantId: user.tenantId,
    });
    console.log("[DEBUG Openings GET] Query params:", {
      propertyId,
      status,
      zoneFilter,
    });

    const where: any = {};

    // Cleaner ve openings ACTIVE de TODOS los tenants (marketplace global)
    // Host/Admin ve solo openings de su tenant
    if (user.role === "CLEANER") {
      where.status = "ACTIVE";
      // NO filtrar por tenantId para Cleaner (marketplace global)
    } else {
      // Host/Admin: solo su tenant
      where.tenantId = user.tenantId;
      if (status) {
        where.status = status;
      }
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (zoneFilter) {
      where.zoneLabel = {
        contains: zoneFilter,
        mode: "insensitive",
      };
    }

    console.log("[DEBUG Openings GET] Where clause:", JSON.stringify(where, null, 2));

    // DEBUG: Verificar todas las openings sin filtro de tenant
    const allOpeningsDebug = await (prisma as any).propertyOpening.findMany({
      where: {
        status: "ACTIVE",
      },
      take: 5,
    });
    console.log("[DEBUG Openings GET] All ACTIVE openings (any tenant):", allOpeningsDebug.length);
    console.log("[DEBUG Openings GET] Sample openings:", allOpeningsDebug.map((o: any) => ({
      id: o.id,
      tenantId: o.tenantId,
      propertyId: o.propertyId,
      status: o.status,
      zoneLabel: o.zoneLabel,
    })));

    const openings = await (prisma as any).propertyOpening.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            // Para Cleaner: NO incluir name, address, etc.
            ...(user.role === "CLEANER"
              ? {}
              : {
                  name: true,
                  shortName: true,
                }),
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("[DEBUG Openings GET] Openings found:", openings.length);
    if (openings.length > 0) {
      console.log("[DEBUG Openings GET] First opening:", JSON.stringify(openings[0], null, 2));
    }

    // Para Cleaner: retornar solo datos públicos
    if (user.role === "CLEANER") {
      const publicOpenings = openings.map((opening: any) => ({
        id: opening.id,
        zoneLabel: opening.zoneLabel,
        notes: opening.notes,
        status: opening.status,
        workType: opening.workType,
        tenantId: opening.tenantId, // Para OwnerCard
        createdAt: opening.createdAt,
      }));

      console.log("[DEBUG Openings GET] Public openings for Cleaner:", publicOpenings.length);
      return NextResponse.json({ openings: publicOpenings });
    }

    return NextResponse.json({ openings });
  } catch (error: any) {
    console.error("Error listando openings:", error);
    return NextResponse.json(
      { error: error.message || "Error listando banderas" },
      { status: 500 }
    );
  }
}

