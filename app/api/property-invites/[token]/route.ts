import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invite = await prisma.propertyInvite.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
        role: true,
        expiresAt: true,
        invitedEmail: true,
        propertyId: true,
        Property: { select: { name: true } },
        Tenant: { select: { id: true, name: true, slug: true } },
        createdByUser: { select: { name: true, email: true } },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    const now = new Date();
    const isExpired = invite.status === "PENDING" && invite.expiresAt < now;

    if (isExpired) {
      return NextResponse.json(
        { error: "Esta invitación ha expirado" },
        { status: 410 }
      );
    }

    if (invite.status === "REVOKED") {
      return NextResponse.json(
        { error: "Esta invitación ha sido revocada" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      id: invite.id,
      status: invite.status,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      propertyId: invite.propertyId,
      propertyName: invite.Property?.name || "Propiedad",
      tenantId: invite.Tenant?.id || null,
      tenantName: invite.Tenant?.name || null,
      tenantSlug: invite.Tenant?.slug || null,
      inviterName: invite.createdByUser?.name || invite.createdByUser?.email || "El anfitrión",
      invitedEmail: invite.invitedEmail,
      type: "PROPERTY",
    });
  } catch (error: any) {
    console.error("Error cargando property invite:", error);
    return NextResponse.json(
      { error: error.message || "Error al cargar invitación" },
      { status: error.status || 500 }
    );
  }
}

