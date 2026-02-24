// app/api/applications/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, requireCleanerUser } from "@/lib/auth/requireUser";
import { canApplyToOpening } from "@/lib/auth/guards";
import { createOrGetThreadHostCleaner } from "@/lib/chat/auth";
import { createId } from "@paralleldrive/cuid2";

/**
 * POST /api/applications
 * Un Cleaner aplica a una opening
 * Crea la application y el ChatThread si no existe
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireCleanerUser(); // Solo CLEANER puede aplicar

    const body = await req.json();
    const { openingId } = body;

    if (!openingId) {
      return NextResponse.json(
        { error: "openingId es requerido" },
        { status: 400 }
      );
    }

    // Verificar que la opening existe y está ACTIVE
    // NO filtrar por tenantId del Cleaner (puede aplicar a openings de otros tenants)
    const opening = await (prisma as any).propertyOpening.findFirst({
      where: {
        id: openingId,
        status: "ACTIVE",
      },
      include: {
        property: {
          select: {
            id: true,
            userId: true,
            admins: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!opening) {
      return NextResponse.json(
        { error: "Opening no encontrada o no está activa" },
        { status: 404 }
      );
    }

    // Verificar que no haya una aplicación duplicada
    // No filtrar por tenantId del Cleaner, solo por openingId + applicantUserId
    const existing = await (prisma as any).propertyApplication.findFirst({
      where: {
        openingId,
        applicantUserId: user.id,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya has aplicado a esta bandera" },
        { status: 400 }
      );
    }

    // Crear application
    // IMPORTANTE: tenantId debe ser el del opening (Host), no del Cleaner
    const application = await (prisma as any).propertyApplication.create({
      data: {
        id: createId(),
        tenantId: opening.tenantId, // Tenant del Host (de la opening), no del Cleaner
        openingId,
        propertyId: opening.propertyId,
        applicantUserId: user.id,
        status: "PENDING",
      },
    });

    // Determinar hostUserId: owner o primer admin
    let hostUserId: string | null = null;
    
    if (opening.property.userId) {
      // Verificar que el owner existe
      const ownerExists = await prisma.user.findUnique({
        where: { id: opening.property.userId },
        select: { id: true },
      });
      if (ownerExists) {
        hostUserId = opening.property.userId;
      }
    }
    
    // Si no hay owner, usar primer admin
    if (!hostUserId && opening.property.admins && opening.property.admins.length > 0) {
      const firstAdmin = opening.property.admins[0];
      if (firstAdmin?.userId) {
        const adminExists = await prisma.user.findUnique({
          where: { id: firstAdmin.userId },
          select: { id: true },
        });
        if (adminExists) {
          hostUserId = firstAdmin.userId;
        }
      }
    }
    
    if (!hostUserId) {
      console.error(`[Chat] No se pudo determinar hostUserId para property ${opening.propertyId}`);
      return NextResponse.json(
        { error: "Error: la propiedad no tiene owner ni admin asignado" },
        { status: 500 }
      );
    }
    
    const cleanerUserId = user.id; // El Cleaner que aplica
    
    // Usar helper que crea/obtiene thread con participants correctos y roles
    // Esto garantiza idempotencia y estructura correcta (Host OWNER, Cleaner MEMBER)
    const thread = await createOrGetThreadHostCleaner(
      hostUserId,
      cleanerUserId,
      opening.propertyId
    );
    
    // Vincular thread con application si no está vinculado ya
    if (!thread.applicationId) {
      await prisma.chatThread.update({
        where: { id: thread.id },
        data: { applicationId: application.id },
      });
    }
    
    // Crear mensaje inicial solo si es un thread nuevo (sin mensajes previos)
    // Verificar si ya tiene mensajes
    const existingMessages = await prisma.chatMessage.count({
      where: { threadId: thread.id },
    });
    
    if (existingMessages === 0) {
      // Es un thread nuevo, crear mensaje inicial automático del Cleaner
      // CROSS-TENANT: Usar tenantId del thread (del Host), no del Cleaner
      const now = new Date();
      const initialMessage = await prisma.chatMessage.create({
        data: {
          id: createId(),
          tenantId: thread.tenantId, // Usar tenantId del thread (cross-tenant)
          threadId: thread.id,
          senderUserId: cleanerUserId,
          body: "Hola 👋, me interesa la limpieza de esta propiedad.\nQuedo atento para coordinar detalles.",
          type: "TEXT",
          serverCreatedAt: now,
          createdAt: now,
        },
      });
      
      // Actualizar lastMessageAt del thread
      await prisma.chatThread.update({
        where: { id: thread.id },
        data: { lastMessageAt: now },
      });
    }

    return NextResponse.json(
      {
        application,
        applicationId: application.id,
        threadId: thread.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creando application:", error);
    return NextResponse.json(
      { error: error.message || "Error creando solicitud" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/applications
 * Aceptar o rechazar una solicitud
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json();
    const { applicationId, status } = body;

    if (!applicationId || !status) {
      return NextResponse.json(
        { error: "applicationId y status son requeridos" },
        { status: 400 }
      );
    }

    if (!["ACCEPTED", "REJECTED", "CANCELLED"].includes(status)) {
      return NextResponse.json(
        { error: "status debe ser ACCEPTED, REJECTED o CANCELLED" },
        { status: 400 }
      );
    }

    const application = await (prisma as any).propertyApplication.findFirst({
      where: {
        id: applicationId,
        tenantId: user.tenantId,
      },
      include: {
        opening: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                userId: true,
              },
            },
          },
        },
        chatThread: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application no encontrada" }, { status: 404 });
    }

    // Validar permisos: solo Owner/Admin con acceso a la propiedad
    const { canManageApplication } = await import("@/lib/auth/guards");
    const canManage = await canManageApplication(user, application.propertyId);
    if (!canManage) {
      return NextResponse.json(
        { error: "No tienes permisos para gestionar esta solicitud" },
        { status: 403 }
      );
    }

    // Actualizar application
    const updated = await (prisma as any).propertyApplication.update({
      where: { id: applicationId },
      data: { status },
    });

    // Si se acepta, crear PropertyCleaner y activar thread
    if (status === "ACCEPTED") {
      // Crear PropertyCleaner si no existe
      await (prisma as any).propertyCleaner.upsert({
        where: {
          propertyId_userId: {
            propertyId: application.propertyId,
            userId: application.applicantUserId,
          },
        },
        create: {
          id: createId(),
          tenantId: user.tenantId,
          propertyId: application.propertyId,
          userId: application.applicantUserId,
        },
        update: {},
      });

      // Activar thread si existe
      if (application.chatThread) {
        const thread = await prisma.chatThread.findUnique({
          where: { id: application.chatThread.id },
          select: { id: true, tenantId: true },
        });

        if (!thread) {
          console.warn(`[Chat] Thread ${application.chatThread.id} no encontrado al activar`);
        } else {
          // Activar thread
          await prisma.chatThread.update({
            where: { id: thread.id },
            data: { status: "ACTIVE" },
          });

          // Crear mensaje SYSTEM para indicar que la solicitud fue aceptada
          // CROSS-TENANT: Usar tenantId del thread, no del user
          const systemMessage = await prisma.chatMessage.create({
            data: {
              id: createId(),
              tenantId: thread.tenantId, // Usar tenantId del thread (cross-tenant)
              threadId: thread.id,
              senderUserId: user.id,
              body: "✅ Solicitud aceptada. Ya pueden coordinar por aquí.",
              type: "SYSTEM",
              serverCreatedAt: new Date(),
            },
          });

          // Actualizar lastMessageAt del thread
          await prisma.chatThread.update({
            where: { id: thread.id },
            data: {
              lastMessageAt: systemMessage.serverCreatedAt,
            },
          });

          // Emitir realtime broadcast para que ambos lados vean el mensaje
          try {
            const { emitRealtimeMessage } = await import("@/lib/realtime/chat");
            await emitRealtimeMessage(thread.id, {
              threadId: thread.id,
              messageId: systemMessage.id,
              serverCreatedAt: systemMessage.serverCreatedAt.toISOString(),
            });
          } catch (error) {
            // Si falla realtime, no es crítico
            console.warn("Error emitiendo realtime para mensaje SYSTEM:", error);
          }
        }
      }
    }

    // Obtener threadId si existe
    const updatedWithThread = await (prisma as any).propertyApplication.findUnique({
      where: { id: applicationId },
      include: {
        chatThread: {
          select: {
            id: true,
          },
        },
      },
    });

    return NextResponse.json({
      application: updated,
      applicationId: updated.id,
      threadId: updatedWithThread?.chatThread?.id || null,
      propertyCleanerCreated: status === "ACCEPTED",
    });
  } catch (error: any) {
    console.error("Error actualizando application:", error);
    return NextResponse.json(
      { error: error.message || "Error actualizando solicitud" },
      { status: 500 }
    );
  }
}

