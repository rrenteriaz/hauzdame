// app/api/teams/[teamId]/invites/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { randomBytes } from "crypto";
import { getTeamInvites } from "@/lib/teams/getTeamInvites";
import { assertServiceTenantById } from "@/lib/tenants/serviceTenant";

/**
 * Genera un token seguro para invitaciones (mínimo 32 caracteres)
 */
function generateSecureToken(): string {
  // Generar 32 bytes aleatorios y convertir a base64url (sin padding)
  const bytes = randomBytes(32);
  return bytes.toString("base64url");
}

/**
 * GET /api/teams/[teamId]/invites
 * Lista las invitaciones de un team
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { teamId } = await params;
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, tenantId: true },
    });
    if (!team) {
      return NextResponse.json({ error: "Team no encontrado" }, { status: 404 });
    }

    try {
      await assertServiceTenantById(team.tenantId);
    } catch {
      return NextResponse.json({ error: "No permitido" }, { status: 403 });
    }

    if (user.role !== "CLEANER") {
      return NextResponse.json({ error: "No permitido" }, { status: 403 });
    }

    const membership = await prisma.teamMembership.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
      select: {
        role: true,
        status: true,
      },
    });

    const allowed =
      !!membership &&
      membership.status === "ACTIVE" &&
      membership.role === "TEAM_LEADER";

    if (!allowed) {
      return NextResponse.json({ error: "No permitido" }, { status: 403 });
    }

    const invites = await getTeamInvites({
      teamId,
      viewer: user,
      baseUrl: req.nextUrl.origin,
      take: 20,
    });

    return NextResponse.json({ invites });
  } catch (error: any) {
    console.error("Error listando invites:", error);
    return NextResponse.json(
      { error: error.message || "Error al listar invitaciones" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/teams/[teamId]/invites
 * Crea una nueva invitación para un team
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { teamId } = await params;

    const body = await req.json();
    const { prefillName, message, expiresInDays = 7 } = body;

    // Validar que el team existe y pertenece al mismo tenant
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team no encontrado" }, { status: 404 });
    }
    try {
      await assertServiceTenantById(team.tenantId);
    } catch {
      return NextResponse.json(
        { error: "No permitido" },
        { status: 403 }
      );
    }

    if (user.role !== "CLEANER") {
      return NextResponse.json({ error: "No permitido" }, { status: 403 });
    }

    const membership = await prisma.teamMembership.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
      select: {
        role: true,
        status: true,
      },
    });

    const allowed =
      !!membership &&
      membership.status === "ACTIVE" &&
      membership.role === "TEAM_LEADER";

    if (!allowed) {
      return NextResponse.json(
        { error: "No tienes permisos para invitar miembros a este equipo" },
        { status: 403 }
      );
    }

    // Validar y clamp expiresInDays
    const days = Math.max(1, Math.min(30, Number.parseInt(String(expiresInDays)) || 7));

    // Generar token seguro
    let token: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      token = generateSecureToken();
      const existing = await prisma.teamInvite.findUnique({
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

    const leaderMembership = await prisma.teamMembership.findFirst({
      where: {
        teamId,
        role: "TEAM_LEADER",
        status: "ACTIVE",
      },
      select: {
        User: { select: { name: true, email: true } },
      },
    });

    const leaderName =
      leaderMembership?.User?.name ||
      leaderMembership?.User?.email ||
      "El líder del equipo";

    const trimmedPrefill = prefillName?.trim() || null;
    const trimmedMessage = message?.trim() || null;
    const defaultMessage = trimmedPrefill
      ? `Hola ${trimmedPrefill}, ${leaderName} te ha invitado a unirte a su equipo de Cleaners.`
      : `${leaderName} te ha invitado a unirte a su equipo de Cleaners.`;

    // Crear invite
    const invite = await prisma.teamInvite.create({
      data: {
        teamId,
        token,
        status: "PENDING",
        createdByUserId: user.id,
        prefillName: trimmedPrefill,
        message: trimmedMessage || defaultMessage,
        expiresAt,
      },
    });

    // Construir link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const inviteLink = `${baseUrl}/join?token=${token}`;

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
