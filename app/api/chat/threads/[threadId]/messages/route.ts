// app/api/chat/threads/[threadId]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireThreadAccess } from "@/lib/authz/teamMembership";
import { checkMessageRateLimit } from "@/lib/auth/rateLimitMessage";
import { createId } from "@paralleldrive/cuid2";

/**
 * GET /api/chat/threads/[threadId]/messages
 * Obtener mensajes de un thread (paginado)
 * REGLA DE ORO: Solo participantes activos pueden leer mensajes.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const resolvedParams = await params;
    const threadId = resolvedParams.threadId;

    // Validar acceso: ChatParticipant activo + TeamMembership ACTIVE o REMOVED (lectura histórica)
    const { user } = await requireThreadAccess(threadId, {
      allowRemovedMembership: true,
    });

    const searchParams = req.nextUrl.searchParams;
    const cursor = searchParams.get("cursor"); // serverCreatedAt ISO string
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100); // Max 100

    // Parsear cursor si existe
    const cursorDate = cursor ? new Date(cursor) : null;
    if (cursor && cursorDate && isNaN(cursorDate.getTime())) {
      return NextResponse.json(
        { error: "Cursor inválido" },
        { status: 400 }
      );
    }

    // CROSS-TENANT: Cargar mensajes SIN filtrar por tenantId
    // El acceso ya se validó con requireChatParticipant (solo participantes activos)
    const messages = await prisma.chatMessage.findMany({
      where: {
        threadId,
        deletedAt: null,
        ...(cursorDate
          ? {
              serverCreatedAt: {
                lt: cursorDate,
              },
            }
          : {}),
      },
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
          },
        },
        asset: {
          select: {
            id: true,
            publicUrl: true,
            mimeType: true,
            width: true,
            height: true,
          },
        },
      },
      orderBy: {
        serverCreatedAt: "desc", // Más reciente primero
      },
      take: limit + 1, // Tomar uno extra para saber si hay más
    });

    // Verificar si hay más mensajes
    const hasMore = messages.length > limit;
    const results = hasMore ? messages.slice(0, limit) : messages;

    // Ordenar ascendente para UI (más antiguo primero)
    const sortedMessages = results.reverse();

    // Generar nextCursor (serverCreatedAt del mensaje más antiguo)
    const nextCursor = sortedMessages.length > 0
      ? sortedMessages[0].serverCreatedAt.toISOString()
      : null;

    return NextResponse.json({
      messages: sortedMessages,
      nextCursor: hasMore ? nextCursor : null,
    });
  } catch (error: any) {
    console.error("Error obteniendo mensajes:", error);
    return NextResponse.json(
      { error: error.message || "Error obteniendo mensajes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/threads/[threadId]/messages
 * Enviar un mensaje (idempotente por clientMessageId)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const resolvedParams = await params;
    const threadId = resolvedParams.threadId;

    // Validar acceso: TeamMembership ACTIVE + ChatParticipant activo
    const { user, thread } = await requireThreadAccess(threadId);

    console.log("[CHAT POST] hit", { 
      threadId, 
      userId: user.id,
      tenantId: user.tenantId,
      time: new Date().toISOString() 
    });

    const body = await req.json();
    const { body: messageBody, assetId, clientMessageId, clientCreatedAt } = body;
    
    console.log("[CHAT POST] body received", { 
      hasMessageBody: !!messageBody, 
      hasAssetId: !!assetId,
      clientMessageId,
      messageBodyLength: messageBody?.length || 0
    });

    if (!messageBody && !assetId) {
      return NextResponse.json(
        { error: "body o assetId es requerido" },
        { status: 400 }
      );
    }

    // Validar que el thread esté abierto (si aplica)
    if (thread.status !== "ACTIVE" && thread.status !== "PENDING") {
      return NextResponse.json(
        { error: "Este hilo está cerrado" },
        { status: 403 }
      );
    }

    // Rate limit: 20 mensajes / minuto / thread
    const rateLimit = checkMessageRateLimit(user.id, threadId);
    if (!rateLimit.allowed) {
      const resetIn = rateLimit.resetAt
        ? Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
        : 60;
      return NextResponse.json(
        {
          error: "Estás enviando mensajes muy rápido. Intenta de nuevo en unos segundos.",
          retryAfter: resetIn,
        },
        { status: 429 }
      );
    }

    // Verificar idempotencia
    // CROSS-TENANT: No filtrar por tenantId, solo por threadId y clientMessageId
    if (clientMessageId) {
      const existing = await prisma.chatMessage.findFirst({
        where: {
          threadId,
          clientMessageId,
        },
        include: {
          senderUser: {
            select: {
              id: true,
              name: true,
            },
          },
          asset: {
            select: {
              id: true,
              publicUrl: true,
            },
          },
        },
      });

      if (existing) {
        // Retornar mensaje existente (idempotencia)
        return NextResponse.json({
          message: existing,
          isDuplicate: true,
        });
      }
    }

    // Crear mensaje
    // Manejar condición de carrera: si dos requests llegan simultáneamente con el mismo clientMessageId,
    // uno fallará con P2002 (unique constraint). En ese caso, buscar y retornar el mensaje existente.
    let message;
    try {
      message = await prisma.chatMessage.create({
        data: {
          id: createId(),
          tenantId: thread.tenantId, // Usar tenantId del thread, no del user (cross-tenant)
          threadId,
          senderUserId: user.id,
          body: messageBody || null,
          type: assetId ? "IMAGE" : "TEXT",
          assetId: assetId || null,
          clientMessageId: clientMessageId || null,
          clientCreatedAt: clientCreatedAt ? new Date(clientCreatedAt) : null,
          serverCreatedAt: new Date(),
        },
        include: {
          senderUser: {
            select: {
              id: true,
              name: true,
            },
          },
          asset: {
            select: {
              id: true,
              publicUrl: true,
            },
          },
        },
      });
    } catch (createError: any) {
      // Si falla por constraint único en clientMessageId, buscar el mensaje existente
      if (createError.code === "P2002" && clientMessageId) {
        // Verificar si el error es específicamente por clientMessageId
        const meta = createError.meta;
        const isClientMessageIdError = 
          meta?.target?.includes("clientMessageId") || 
          meta?.field_name === "clientMessageId";

        if (isClientMessageIdError) {
          const existing = await prisma.chatMessage.findFirst({
            where: {
              threadId,
              clientMessageId,
            },
            include: {
              senderUser: {
                select: {
                  id: true,
                  name: true,
                },
              },
              asset: {
                select: {
                  id: true,
                  publicUrl: true,
                },
              },
            },
          });

          if (existing) {
            // Retornar mensaje existente (idempotencia - condición de carrera resuelta)
            // No loguear como error, es comportamiento esperado
            return NextResponse.json({
              message: existing,
              isDuplicate: true,
            });
          }
        }
      }
      // Si no es un error de constraint único o no encontramos el mensaje existente, relanzar el error
      throw createError;
    }

    // Actualizar lastMessageAt del thread
    await prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    // Emitir broadcast de Supabase Realtime
    try {
      const { emitRealtimeMessage } = await import("@/lib/realtime/chat");
      await emitRealtimeMessage(threadId, message);
    } catch (error) {
      console.error("[Realtime] Error emitiendo mensaje:", error);
      // No fallar si el broadcast falla
    }

    console.log("[CHAT POST] success", { 
      messageId: message.id, 
      clientMessageId,
      status: 201,
      responseKeys: Object.keys(message),
      messageCreatedAt: message.serverCreatedAt,
      messageBody: message.body?.substring(0, 50),
      messageSenderUserId: message.senderUserId
    });
    
    // Log del JSON exacto que se devuelve
    const responseJson = { message };
    console.log("[CHAT POST] response JSON", JSON.stringify(responseJson).slice(0, 500));

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error("[CHAT POST] error", { 
      error: error.message, 
      code: error.code,
      status: 500 
    });
    return NextResponse.json(
      { error: error.message || "Error enviando mensaje" },
      { status: 500 }
    );
  }
}

