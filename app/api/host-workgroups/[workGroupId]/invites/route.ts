// app/api/host-workgroups/[workGroupId]/invites/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getDefaultTenant } from "@/lib/tenant";
import { randomBytes } from "crypto";

/**
 * Genera un token seguro para invitaciones (mínimo 32 caracteres)
 */
function generateSecureToken(): string {
  // Generar 32 bytes aleatorios y convertir a base64url (sin padding)
  const bytes = randomBytes(32);
  return bytes.toString("base64url");
}

/**
 * POST /api/host-workgroups/[workGroupId]/invites
 * Crea una nueva invitación para un WorkGroup
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workGroupId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { workGroupId } = await params;
    const tenant = await getDefaultTenant();
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const { prefillName, expiresInDays = 7 } = body;

    // Validar que el WorkGroup existe y pertenece al tenant
    const workGroup = await prisma.hostWorkGroup.findFirst({
      where: {
        id: workGroupId,
        tenantId: tenant.id,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!workGroup) {
      return NextResponse.json({ error: "Grupo de trabajo no encontrado" }, { status: 404 });
    }

    // Validar y clamp expiresInDays
    const days = Math.max(1, Math.min(30, Number.parseInt(String(expiresInDays)) || 7));

    // Generar token seguro
    let token: string;
    let attempts = 0;
    const maxAttempts = 5;

    // Verificar que el modelo está disponible
    if (!(prisma as any).hostWorkGroupInvite) {
      return NextResponse.json(
        { error: "El modelo HostWorkGroupInvite no está disponible. Por favor, regenera Prisma Client y reinicia el servidor." },
        { status: 500 }
      );
    }

    do {
      token = generateSecureToken();
      const existing = await (prisma as any).hostWorkGroupInvite.findUnique({
        where: { token },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Error al generar token único. Intenta nuevamente." },
        { status: 500 }
      );
    }

    // Calcular fecha de expiración
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const trimmedPrefill = prefillName?.trim() || null;

    // Crear invite
    const invite = await (prisma as any).hostWorkGroupInvite.create({
      data: {
        tenantId: tenant.id,
        workGroupId,
        token,
        status: "PENDING",
        createdByUserId: user.id,
        prefillName: trimmedPrefill ?? undefined,
        message: null, // No se usa mensaje personalizado (igual que TL→SM)
        expiresAt,
      },
    });

    // Construir link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const inviteLink = `${baseUrl}/join/host?token=${token}`;

    return NextResponse.json({
      ok: true,
      invite: {
        id: invite.id,
        status: invite.status,
        expiresAt: invite.expiresAt.toISOString(),
        token: invite.token,
      },
      inviteLink,
    });
  } catch (error: any) {
    console.error("Error creando invite:", error);
    return NextResponse.json(
      { error: error.message || "Error al crear invitación" },
      { status: error.status || 500 }
    );
  }
}

