// app/api/chat/threads/[threadId]/uploads/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { requireChatParticipant } from "@/lib/chat/auth";
import { createId } from "@paralleldrive/cuid2";
import { SupabaseStorageProvider } from "@/lib/storage/supabaseStorage";
import { emitRealtimeMessage } from "@/lib/realtime/chat";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BUCKET_NAME = "assets";

/**
 * POST /api/chat/threads/[threadId]/uploads
 * Subir imagen directamente y crear mensaje IMAGE (flujo simplificado)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const user = await requireUser();
    const resolvedParams = await params;
    const threadId = resolvedParams.threadId;

    // Validar que el usuario es participante activo del thread
    // requireChatParticipant lanza notFound() si no es participante
    await requireChatParticipant(threadId, user.id);

    // Parsear multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const clientMessageId = formData.get("clientMessageId") as string | null;
    const clientCreatedAt = formData.get("clientCreatedAt") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "file es requerido" },
        { status: 400 }
      );
    }

    // Rate limit: 10 imágenes / 5 minutos / user (simple in-memory por ahora)
    // TODO: Implementar rate limit robusto para uploads
    // Por ahora, permitir sin rate limit estricto (el tamaño de archivo ya limita)

    // Validar tipo MIME declarado
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido: ${file.type}. Solo JPG, PNG y WebP` },
        { status: 400 }
      );
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Archivo demasiado grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Leer archivo como buffer para validar MIME real
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validar MIME type real (magic bytes)
    // JPEG: FF D8 FF
    // PNG: 89 50 4E 47
    // WebP: 52 49 46 46 ... 57 45 42 50
    const isValidMime = (buf: Buffer, expectedMime: string): boolean => {
      if (buf.length < 3) return false;
      if (expectedMime === "image/jpeg" && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
      if (expectedMime === "image/png" && buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
      if (expectedMime === "image/webp" && buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
      return false;
    };

    if (!isValidMime(buffer, file.type)) {
      return NextResponse.json(
        { error: "El tipo de archivo no coincide con la extensión. Por favor, sube una imagen válida." },
        { status: 400 }
      );
    }

    // Obtener tenantId del thread (necesario para ChatMessage.tenantId)
    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      select: { tenantId: true },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "Thread no encontrado" },
        { status: 404 }
      );
    }

    // Verificar idempotencia (CROSS-TENANT: No filtrar por tenantId, solo por threadId y clientMessageId)
    if (clientMessageId) {
      const existing = await prisma.chatMessage.findFirst({
        where: {
          threadId,
          clientMessageId,
        },
      });

      if (existing) {
        return NextResponse.json({
          message: existing,
          isDuplicate: true,
        });
      }
    }

    // Generar assetId y storage key (usar extensión segura basada en MIME)
    const assetId = createId();
    const getExtensionFromMime = (mime: string): string => {
      if (mime === "image/jpeg") return "jpg";
      if (mime === "image/png") return "png";
      if (mime === "image/webp") return "webp";
      return "jpg"; // fallback
    };
    const ext = getExtensionFromMime(file.type);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const storageKey = `tenants/${thread.tenantId}/chat/${year}/${month}/${assetId}.${ext}`;

    // Subir a Supabase Storage
    const storage = new SupabaseStorageProvider();
    const { publicUrl } = await storage.putPublicObject({
      bucket: BUCKET_NAME,
      key: storageKey,
      contentType: file.type,
      buffer,
    });

    // Crear Asset
    const asset = await prisma.asset.create({
      data: {
        id: assetId,
        tenantId: user.tenantId,
        type: "IMAGE",
        provider: "SUPABASE",
        variant: "ORIGINAL",
        bucket: BUCKET_NAME,
        key: storageKey,
        publicUrl,
        mimeType: file.type,
        sizeBytes: file.size,
        width: null,
        height: null,
        groupId: assetId,
        uploadedAt: new Date(),
        createdByUserId: user.id,
      },
    });

    // Crear mensaje IMAGE (usar tenantId del thread, no del user para cross-tenant)
    const message = await prisma.chatMessage.create({
      data: {
        id: createId(),
        tenantId: thread.tenantId, // Usar tenantId del thread, no del user (cross-tenant)
        threadId,
        senderUserId: user.id,
        body: null, // IMAGE no tiene body
        type: "IMAGE",
        assetId,
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
            mimeType: true,
            width: true,
            height: true,
          },
        },
      },
    });

    // Actualizar lastMessageAt del thread
    await prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    // Emitir broadcast de Supabase Realtime
    try {
      await emitRealtimeMessage(threadId, message);
    } catch (error) {
      console.error("[Realtime] Error emitiendo mensaje:", error);
      // No fallar si el broadcast falla
    }

    return NextResponse.json({
      message,
      messageId: message.id,
      threadId,
    });
  } catch (error: any) {
    console.error("Error subiendo imagen:", error);
    return NextResponse.json(
      { error: error.message || "Error subiendo imagen" },
      { status: 500 }
    );
  }
}

