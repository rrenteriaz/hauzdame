// app/api/media/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";
import { SupabaseStorageProvider } from "@/lib/storage/supabaseStorage";
import { createId } from "@paralleldrive/cuid2";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_CLEANING_PHOTOS = 20;

interface UploadContext {
  kind: "propertyCover" | "userAvatar" | "cleaningPhoto";
  propertyId?: string;
  cleaningId?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Obtener tenant
    const tenant = await getDefaultTenant();
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    // Parsear multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const contextKind = formData.get("contextKind") as string | null;
    const propertyId = formData.get("propertyId") as string | null;
    const cleaningId = formData.get("cleaningId") as string | null;
    const takenAtStr = formData.get("takenAt") as string | null;

    if (!file || !contextKind) {
      return NextResponse.json(
        { error: "file y contextKind son requeridos" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido: ${file.type}` },
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

    const context: UploadContext = {
      kind: contextKind as UploadContext["kind"],
      propertyId: propertyId || undefined,
      cleaningId: cleaningId || undefined,
    };

    // Validar permisos según contexto
    // TODO: Implementar autenticación real cuando esté disponible
    // Por ahora, asumimos que el usuario tiene permisos si llega aquí
    const userId = formData.get("userId") as string | null; // Temporal: pasar userId desde cliente

    if (context.kind === "propertyCover") {
      if (!context.propertyId) {
        return NextResponse.json(
          { error: "propertyId es requerido para propertyCover" },
          { status: 400 }
        );
      }
      // Validar que la propiedad existe y pertenece al tenant
      const property = await prisma.property.findFirst({
        where: { id: context.propertyId, tenantId: tenant.id },
      });
      if (!property) {
        return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
      }
    } else if (context.kind === "userAvatar") {
      // Validar que el usuario existe y pertenece al tenant
      if (!userId) {
        return NextResponse.json(
          { error: "userId es requerido para userAvatar" },
          { status: 400 }
        );
      }
      const user = await prisma.user.findFirst({
        where: { id: userId, tenantId: tenant.id },
      });
      if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }
    } else if (context.kind === "cleaningPhoto") {
      if (!context.cleaningId) {
        return NextResponse.json(
          { error: "cleaningId es requerido para cleaningPhoto" },
          { status: 400 }
        );
      }
      // Validar que la limpieza existe y no está cerrada
      const cleaning = await (prisma as any).cleaning.findFirst({
        where: { id: context.cleaningId, tenantId: tenant.id },
        select: { id: true, status: true },
      });
      if (!cleaning) {
        return NextResponse.json({ error: "Limpieza no encontrada" }, { status: 404 });
      }
      if (cleaning.status === "COMPLETED" || cleaning.status === "CANCELLED") {
        return NextResponse.json(
          { error: "No se pueden agregar fotos a limpiezas cerradas" },
          { status: 403 }
        );
      }
      // Validar límite de 20 fotos (contar CleaningMedia con assets no eliminados)
      const activePhotosCount = await (prisma as any).cleaningMedia.count({
        where: {
          cleaningId: context.cleaningId,
          tenantId: tenant.id,
          asset: {
            deletedAt: null,
          },
        },
      });
      if (activePhotosCount >= MAX_CLEANING_PHOTOS) {
        return NextResponse.json(
          { error: `Máximo ${MAX_CLEANING_PHOTOS} fotos por limpieza` },
          { status: 400 }
        );
      }
    }

    // Parsear takenAt si existe
    let takenAt: Date | null = null;
    if (takenAtStr) {
      const parsed = new Date(takenAtStr);
      if (!isNaN(parsed.getTime())) {
        takenAt = parsed;
      }
    }

    // Leer archivo como buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generar ID y storage key
    const assetId = createId();
    const ext = file.name.split(".").pop() || "jpg";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const storageKey = `tenants/${tenant.id}/assets/${year}/${month}/${assetId}.${ext}`;

    // Subir a Supabase Storage
    const storage = new SupabaseStorageProvider();
    const bucket = "assets"; // Bucket por defecto
    const { publicUrl } = await storage.putPublicObject({
      bucket,
      key: storageKey,
      contentType: file.type,
      buffer,
    });

    // Extraer dimensiones (opcional, se puede hacer en background)
    // Por ahora, las dejamos como null y se pueden actualizar después

    // Crear registro Asset
    const asset = await prisma.asset.create({
      data: {
        id: assetId,
        tenantId: tenant.id,
        type: "IMAGE",
        provider: "SUPABASE",
        variant: "ORIGINAL",
        bucket,
        key: storageKey,
        publicUrl,
        mimeType: file.type,
        sizeBytes: file.size,
        width: null, // Se puede extraer después
        height: null,
        groupId: assetId, // Por ahora, cada asset es su propio grupo
        takenAt,
        uploadedAt: new Date(),
        createdByUserId: userId || null,
      },
    });

    // Vincular según contexto
    if (context.kind === "propertyCover") {
      // Actualizar Property.coverMediaId (y opcionalmente limpiar el anterior)
      const existingProperty = await prisma.property.findFirst({
        where: { id: context.propertyId! },
        select: { coverMediaId: true },
      });
      if (existingProperty?.coverMediaId) {
        // Soft delete del asset anterior
        await prisma.asset.update({
          where: { id: existingProperty.coverMediaId },
          data: { deletedAt: new Date() },
        });
      }
      await prisma.property.update({
        where: { id: context.propertyId! },
        data: { coverMediaId: assetId },
      });
    } else if (context.kind === "userAvatar") {
      // Actualizar User.avatarMediaId
      const existingUser = await prisma.user.findFirst({
        where: { id: userId! },
        select: { avatarMediaId: true },
      });
      if (existingUser?.avatarMediaId) {
        await prisma.asset.update({
          where: { id: existingUser.avatarMediaId },
          data: { deletedAt: new Date() },
        });
      }
      await prisma.user.update({
        where: { id: userId! },
        data: { avatarMediaId: assetId },
      });
    } else if (context.kind === "cleaningPhoto") {
      // Obtener el conteo actual para sortOrder (después de crear el asset)
      const currentCount = await (prisma as any).cleaningMedia.count({
        where: {
          cleaningId: context.cleaningId!,
          tenantId: tenant.id,
          asset: {
            deletedAt: null,
          },
        },
      });
      // Crear CleaningMedia
      await (prisma as any).cleaningMedia.create({
        data: {
          tenantId: tenant.id,
          cleaningId: context.cleaningId!,
          assetId: assetId,
          sortOrder: currentCount, // Orden secuencial
        },
      });
    }

    return NextResponse.json({
      asset: {
        id: asset.id,
        url: publicUrl,
        takenAt: takenAt?.toISOString() || null,
        uploadedAt: asset.uploadedAt.toISOString(),
        width: asset.width,
        height: asset.height,
      },
    });
  } catch (error: any) {
    console.error("Error subiendo media:", error);
    return NextResponse.json(
      { error: error.message || "Error subiendo archivo" },
      { status: 500 }
    );
  }
}

