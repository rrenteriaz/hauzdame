// app/api/media/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";
import { SupabaseStorageProvider } from "@/lib/storage/supabaseStorage";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const assetId = resolvedParams.id;

    // Obtener tenant
    const tenant = await getDefaultTenant();
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    // Obtener query params para contexto
    const searchParams = req.nextUrl.searchParams;
    const contextKind = searchParams.get("contextKind");
    const userId = searchParams.get("userId");

    // Buscar asset
    const asset = await (prisma as any).asset.findFirst({
      where: { id: assetId, tenantId: tenant.id, deletedAt: null },
      include: {
        propertyCover: true,
        userAvatar: true,
        cleaningMedia: {
          include: {
            cleaning: {
              select: { id: true, status: true },
            },
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset no encontrado" }, { status: 404 });
    }

    // Validar permisos según contexto
    if (asset.propertyCover) {
      // Validar que el usuario tiene permisos sobre la propiedad
      // TODO: Implementar validación de permisos real
    } else if (asset.userAvatar) {
      // Validar que el usuario puede borrar su propio avatar o es admin
      if (userId && asset.userAvatar.id !== userId) {
        // TODO: Validar si es admin
      }
    } else if (asset.cleaningMedia.length > 0) {
      // Validar que la limpieza no está cerrada
      const cleaningMedia = asset.cleaningMedia[0];
      if (cleaningMedia.cleaning.status === "COMPLETED" || cleaningMedia.cleaning.status === "CANCELLED") {
        return NextResponse.json(
          { error: "No se pueden borrar fotos de limpiezas cerradas" },
          { status: 403 }
        );
      }
    }

    // Soft delete del asset
    await (prisma as any).asset.update({
      where: { id: assetId },
      data: { deletedAt: new Date() },
    });

    // Limpiar relaciones
    if (asset.propertyCover) {
      await (prisma as any).property.update({
        where: { id: asset.propertyCover.id },
        data: { coverMediaId: null },
      });
    } else if (asset.userAvatar) {
      await (prisma as any).user.update({
        where: { id: asset.userAvatar.id },
        data: { avatarMediaId: null },
      });
    } else if (asset.cleaningMedia.length > 0) {
      // Borrar CleaningMedia rows
      for (const cm of asset.cleaningMedia) {
        await (prisma as any).cleaningMedia.delete({
          where: { id: cm.id },
        });
      }
    }

    // Opcional: Borrar archivo físico del storage
    // Por ahora, lo dejamos para limpieza posterior (soft delete)
    // Si se quiere borrar inmediatamente:
    try {
      const storage = new SupabaseStorageProvider();
      await storage.deleteObject({
        bucket: asset.bucket,
        key: asset.key,
      });
    } catch (error) {
      console.warn("Error borrando archivo físico (continuando):", error);
      // No fallar si el archivo ya no existe
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error borrando media:", error);
    return NextResponse.json(
      { error: error.message || "Error borrando archivo" },
      { status: 500 }
    );
  }
}

