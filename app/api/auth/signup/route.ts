// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { ensureCleanerPersonalTeam } from "@/lib/teams/provisioning";
import { ensureCanonicalVariantGroupsForTenant } from "@/lib/variant-groups-bootstrap";

type SignupEcosystem = "services" | "host";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * POST /api/auth/signup
 * Crea una cuenta nueva sin invitación (Servicios o Host)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, token, redirect, ecosystem: ecosystemRaw } = body;
    const ecosystem: SignupEcosystem =
      token ? "services" : ecosystemRaw === "host" ? "host" : "services";

    // Validaciones básicas
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    // Validar password (mínimo 6 caracteres)
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Rate limiting por IP + email
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `signup:${ip}:${email}`;
    
    if (!checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000)) { // 5 intentos por hora
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo en 1 hora." },
        { status: 429 }
      );
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 }
      );
    }

    // Hashear password
    const hashedPassword = await hashPassword(password);

    const displayName = name?.trim() || email.split("@")[0] || "Usuario";
    const debugPayload: {
      createdUserId?: string;
      createdTenantId?: string;
      createdTeamId?: string;
      createdMembershipId?: string;
      createdProfiles?: { cleanerProfileId?: string };
    } = {};

    const user = await prisma.$transaction(async (tx) => {
      console.log("[signup] inicio", { ecosystem, email });

      let tenantId: string | null = null;
      if (ecosystem === "services" || ecosystem === "host") {
        const tenantName =
          ecosystem === "services" ? `Services - ${displayName}` : `Host - ${displayName}`;
        const baseSlug = slugify(tenantName);

        console.log("[signup] creando tenant", { tenantName });
        let finalSlug = baseSlug;
        let attempts = 0;
        let tenant: { id: string } | null = null;

        while (attempts < 10) {
          try {
            tenant = await tx.tenant.create({
              data: { name: tenantName, slug: finalSlug },
              select: { id: true },
            });
            break;
          } catch (error: any) {
            if (error.code === "P2002" && error.meta?.target?.includes("slug")) {
              attempts++;
              finalSlug = `${baseSlug}-${attempts}`;
            } else {
              throw error;
            }
          }
        }

        if (!tenant) {
          throw new Error("No se pudo crear tenant después de 10 intentos");
        }

        tenantId = tenant.id;
        debugPayload.createdTenantId = tenant.id;
        console.log("[signup] tenant creado", { tenantId: tenant.id });

        if (ecosystem === "host") {
          await ensureCanonicalVariantGroupsForTenant(tenant.id, tx);
          console.log("[signup] variant groups bootstrap para Host");
        }
      }

      console.log("[signup] creando usuario", { ecosystem });
      const createdUser = await tx.user.create({
        data: {
          email,
          hashedPassword,
          name: name?.trim() || null,
          role: ecosystem === "host" ? "OWNER" : "CLEANER",
          tenantId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true,
        },
      });
      debugPayload.createdUserId = createdUser.id;
      console.log("[signup] usuario creado", { userId: createdUser.id });

      if (ecosystem === "services" && tenantId) {
        console.log("[signup] asegurando team base", { tenantId });
        const result = await ensureCleanerPersonalTeam({
          tenantId,
          cleanerUserId: createdUser.id,
          db: tx,
        });
        debugPayload.createdTeamId = result.teamId;
        debugPayload.createdMembershipId = result.membershipId;
        console.log("[signup] team/membership asegurados", {
          teamId: result.teamId,
          membershipId: result.membershipId,
        });

        const cleanerProfile = await tx.cleanerProfile.create({
          data: {
            userId: createdUser.id,
            fullName: name?.trim() || null,
          },
          select: { id: true },
        });
        debugPayload.createdProfiles = { cleanerProfileId: cleanerProfile.id };
        console.log("[signup] cleanerProfile creado", { cleanerProfileId: cleanerProfile.id });
      }

      if (tenantId) {
        await tx.metricEvent.create({
          data: {
            tenantId,
            type: "USER_SIGNUP",
            payload: {
              ecosystem,
              userId: createdUser.id,
              email,
            },
          },
        });
        await tx.metricEvent.create({
          data: {
            tenantId,
            type: "TENANT_BOOTSTRAP_CREATED",
            payload: {
              ecosystem,
              tenantId,
              userId: createdUser.id,
            },
          },
        });
        if (debugPayload.createdTeamId) {
          await tx.metricEvent.create({
            data: {
              tenantId,
              type: "TEAM_CREATED",
              payload: {
                teamId: debugPayload.createdTeamId,
                userId: createdUser.id,
              },
            },
          });
        }
      }

      return createdUser;
    });

    // Crear sesión inmediatamente
    await createSession(user.id);

    // Determinar redirección: priorizar redirect param, luego token, luego por defecto
    let redirectTo = redirect || (ecosystem === "host" ? "/host/hoy" : "/cleaner");
    
    // Solo intentar claim de TeamInvite si hay token y NO hay redirect
    // Si hay redirect, significa que viene de /join/host y debe regresar ahí
    if (token && !redirect) {
      try {
        const { claimInvite } = await import("@/lib/invites/claimInvite");
        const claimResult = await claimInvite(token, user.id);
        redirectTo = claimResult.redirectTo || "/app";
      } catch (claimError: any) {
        // Si claim falla, continuar con redirectTo por defecto
        // (el usuario ya está creado y logueado, puede reclamar después)
        console.error("Error reclamando invite después de signup:", claimError);
        // No propagar el error, el signup fue exitoso
        redirectTo = redirect || "/app";
      }
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      redirectTo,
      ...(process.env.NODE_ENV === "development" ? { debug: debugPayload } : {}),
    });
  } catch (error: any) {
    console.error("Error en signup:", error);

    // Manejar errores de unique constraint (email duplicado)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Error al crear cuenta" },
      { status: 500 }
    );
  }
}

