// app/api/assets/[assetId]/signed/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { canAccessThread } from "@/lib/auth/guards";
import { createClient } from "@supabase/supabase-js";

const SIGNED_URL_EXPIRY_SECONDS = 30 * 60; // 30 minutos

/**
 * GET /api/assets/[assetId]/signed
 * Obtener signed URL para visualizar un asset (solo si el usuario tiene acceso)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const user = await requireUser();
    const resolvedParams = await params;
    const assetId = resolvedParams.assetId;

    // Obtener asset y verificar que pertenece al tenant
    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        tenantId: user.tenantId,
        deletedAt: null,
      },
      include: {
        chatMessages: {
          select: {
            threadId: true,
          },
          take: 1,
        },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que el asset está asociado a un mensaje de chat
    // y que el usuario tiene acceso a ese thread
    if (asset.chatMessages.length === 0) {
      return NextResponse.json(
        { error: "Asset no asociado a un mensaje de chat" },
        { status: 403 }
      );
    }

    const threadId = asset.chatMessages[0].threadId;

    // Validar acceso al thread
    const canAccess = await canAccessThread(user, threadId);
    if (!canAccess) {
      return NextResponse.json(
        { error: "No tienes acceso a este asset" },
        { status: 403 }
      );
    }

    // Si el asset tiene publicUrl y el bucket es público, retornarlo directamente
    if (asset.publicUrl) {
      return NextResponse.json({
        url: asset.publicUrl,
        expiresAt: null, // No expira si es público
      });
    }

    // Generar signed URL (Supabase)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Storage no configurado" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(asset.bucket)
      .createSignedUrl(asset.key, SIGNED_URL_EXPIRY_SECONDS);

    if (signedUrlError || !signedUrlData) {
      return NextResponse.json(
        { error: "Error generando signed URL" },
        { status: 500 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + SIGNED_URL_EXPIRY_SECONDS);

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error obteniendo signed URL:", error);
    return NextResponse.json(
      { error: error.message || "Error obteniendo signed URL" },
      { status: 500 }
    );
  }
}

