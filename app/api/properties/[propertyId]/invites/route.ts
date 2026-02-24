import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { randomBytes } from "crypto";

const HOST_ROLES = ["OWNER", "ADMIN", "MANAGER", "AUXILIAR"] as const;

function generateSecureToken(): string {
  const bytes = randomBytes(32);
  return bytes.toString("base64url");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!HOST_ROLES.includes(user.role as (typeof HOST_ROLES)[number])) {
      return NextResponse.json({ error: "No permitido" }, { status: 403 });
    }

    const { propertyId } = await params;
    const body = await req.json();
    const { invitedEmail, role, expiresInDays = 7 } = body ?? {};

    if (!invitedEmail || typeof invitedEmail !== "string") {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (role !== "CLEANER" && role !== "MANAGER") {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, tenantId: true, name: true },
    });
    if (!property) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }
    if (user.tenantId !== property.tenantId) {
      return NextResponse.json({ error: "No permitido" }, { status: 403 });
    }

    const days = Math.max(1, Math.min(30, Number.parseInt(String(expiresInDays)) || 7));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    let token: string;
    let attempts = 0;
    const maxAttempts = 5;
    do {
      token = generateSecureToken();
      const existing = await prisma.propertyInvite.findUnique({ where: { token } });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Error al generar token único. Intenta nuevamente." },
        { status: 500 }
      );
    }

    const invite = await prisma.propertyInvite.create({
      data: {
        tenantId: property.tenantId,
        propertyId: property.id,
        token,
        invitedEmail: invitedEmail.trim().toLowerCase(),
        role,
        status: "PENDING",
        expiresAt,
        createdByUserId: user.id,
      },
      select: { id: true, status: true, expiresAt: true, token: true },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const inviteLink = `${baseUrl}/join?token=${token}&type=property`;

    return NextResponse.json({
      ok: true,
      invite,
      inviteLink,
    });
  } catch (error: any) {
    console.error("Error creando property invite:", error);
    return NextResponse.json(
      { error: error.message || "Error al crear invitación" },
      { status: error.status || 500 }
    );
  }
}

