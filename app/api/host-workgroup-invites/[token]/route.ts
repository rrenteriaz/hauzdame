// app/api/host-workgroup-invites/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const resolvedParams = await params;
  const token = resolvedParams.token;

  const invite = await prisma.hostWorkGroupInvite.findUnique({
    where: { token },
    include: {
      workGroup: {
        select: {
          id: true,
          name: true,
        },
      },
      createdByUser: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  const now = new Date();
  const expiresAt = new Date(invite.expiresAt);
  const isExpired = expiresAt < now;
  const effectiveStatus =
    invite.status === "PENDING" && isExpired ? "EXPIRED" : invite.status;

  if (effectiveStatus !== "PENDING") {
    return NextResponse.json(
      {
        error:
          effectiveStatus === "EXPIRED"
            ? "Esta invitación ha expirado"
            : effectiveStatus === "REVOKED"
            ? "Esta invitación ha sido revocada"
            : "Esta invitación ya fue aceptada",
      },
      { status: 410 }
    );
  }

  return NextResponse.json({
    id: invite.id,
    workGroupId: invite.workGroupId,
    workGroupName: invite.workGroup.name,
    status: effectiveStatus,
    expiresAt: invite.expiresAt.toISOString(),
    prefillName: invite.prefillName,
    message: invite.message,
    createdAt: invite.createdAt.toISOString(),
    createdByUser: {
      name: invite.createdByUser.name,
    },
  });
}

