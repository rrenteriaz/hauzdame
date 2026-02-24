import "dotenv/config";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { ensureCleanerPersonalTeam } from "@/lib/teams/provisioning";
import { isServiceTenant } from "@/lib/tenants/serviceTenant";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";

const QA_PASSWORD = "QaInvite123!";
const OUTPUT_PATH = path.join("scripts", "qa", "qa-tokens.json");

const QA_EMAILS = {
  cleanerA: "qa.cleaner.a@hausdame.test",
  cleanerB: "qa.cleaner.b@hausdame.test",
  host: "qa.host@hausdame.test",
};

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

async function ensureUser(email: string, role: "CLEANER" | "OWNER", name: string) {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, tenantId: true, hashedPassword: true },
  });
  const hashedPassword = await hashPassword(QA_PASSWORD);

  if (existing) {
    if (existing.role !== role) {
      throw new Error(`El usuario ${email} tiene role distinto (${existing.role}).`);
    }
    if (!existing.hashedPassword) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { hashedPassword },
      });
    }
    return existing;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role,
      hashedPassword,
    },
    select: { id: true, role: true, tenantId: true },
  });
  return user;
}

async function ensureServiceTenant(userId: string, displayName: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, tenantId: true },
  });
  if (user?.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, name: true, slug: true },
    });
    if (tenant && isServiceTenant(tenant)) {
      return tenant;
    }
  }

  const baseSlug = `services-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const baseName = `Services - ${displayName}`;
  let tenant = await prisma.tenant.findFirst({
    where: { slug: baseSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: baseName, slug: baseSlug },
      select: { id: true, name: true, slug: true },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { tenantId: tenant.id },
  });

  return tenant;
}

async function ensureHostTenantAndProperty(hostUserId: string) {
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: "host-qa" },
    select: { id: true },
  });
  const tenant =
    existingTenant ??
    (await prisma.tenant.create({
      data: { name: "Host - QA", slug: "host-qa" },
      select: { id: true },
    }));
  const tenantId = tenant.id;

  await prisma.user.update({
    where: { id: hostUserId },
    data: { tenantId },
  });

  const property = await prisma.property.findFirst({
    where: { tenantId, name: "QA Property" },
    select: { id: true },
  });
  if (property) {
    return { tenantId, propertyId: property.id };
  }

  const created = await prisma.property.create({
    data: {
      tenantId,
      name: "QA Property",
      userId: hostUserId,
    },
    select: { id: true },
  });

  return { tenantId, propertyId: created.id };
}

async function ensureTeamInvite(teamId: string, createdByUserId: string, label: string) {
  const now = new Date();
  const existing = await prisma.teamInvite.findFirst({
    where: {
      teamId,
      status: "PENDING",
      expiresAt: { gt: now },
      prefillName: label,
    },
    select: { token: true },
  });
  if (existing) return existing.token;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.teamInvite.create({
    data: {
      teamId,
      token: generateToken(),
      status: "PENDING",
      createdByUserId,
      prefillName: label,
      message: `[QA] ${label}`,
      expiresAt,
    },
    select: { token: true },
  });

  return invite.token;
}

async function ensurePropertyInvite(args: {
  propertyId: string;
  tenantId: string;
  createdByUserId: string;
  invitedEmail: string;
  role: "CLEANER" | "MANAGER";
}) {
  const propertyInvite = (prisma as any).propertyInvite;
  const now = new Date();
  const existing = await propertyInvite.findFirst({
    where: {
      propertyId: args.propertyId,
      invitedEmail: args.invitedEmail,
      role: args.role,
      status: "PENDING",
      expiresAt: { gt: now },
    },
    select: { token: true },
  });
  if (existing) return existing.token;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await propertyInvite.create({
    data: {
      tenantId: args.tenantId,
      propertyId: args.propertyId,
      token: generateToken(),
      invitedEmail: args.invitedEmail,
      role: args.role,
      status: "PENDING",
      expiresAt,
      createdByUserId: args.createdByUserId,
    },
    select: { token: true },
  });
  return invite.token;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("QA scripts no deben ejecutarse en producción.");
  }
  const cleanerA = await ensureUser(QA_EMAILS.cleanerA, "CLEANER", "QA Cleaner A");
  const cleanerB = await ensureUser(QA_EMAILS.cleanerB, "CLEANER", "QA Cleaner B");
  const hostUser = await ensureUser(QA_EMAILS.host, "OWNER", "QA Host");

  const serviceTenant = await ensureServiceTenant(cleanerA.id, "QA Cleaner A");
  await ensureServiceTenant(cleanerB.id, "QA Cleaner B");

  const { teamId: baseTeamId } = await ensureCleanerPersonalTeam({
    tenantId: serviceTenant.id,
    cleanerUserId: cleanerA.id,
  });

  const { tenantId: hostTenantId, propertyId } = await ensureHostTenantAndProperty(hostUser.id);

  const teamInviteTokenSingle = await ensureTeamInvite(baseTeamId, cleanerA.id, "[QA]-single");
  const teamInviteTokenRace = await ensureTeamInvite(baseTeamId, cleanerA.id, "[QA]-race");

  const propertyInviteTokenCleaner = await ensurePropertyInvite({
    propertyId,
    tenantId: hostTenantId,
    createdByUserId: hostUser.id,
    invitedEmail: "qa+cleaner@hausdame.test",
    role: "CLEANER",
  });
  const propertyInviteTokenManager = await ensurePropertyInvite({
    propertyId,
    tenantId: hostTenantId,
    createdByUserId: hostUser.id,
    invitedEmail: "qa+manager@hausdame.test",
    role: "MANAGER",
  });

  const output = {
    qaPassword: QA_PASSWORD,
    users: {
      cleanerA: { id: cleanerA.id, email: QA_EMAILS.cleanerA },
      cleanerB: { id: cleanerB.id, email: QA_EMAILS.cleanerB },
      host: { id: hostUser.id, email: QA_EMAILS.host },
    },
    service: {
      tenantId: serviceTenant.id,
      teamId: baseTeamId,
      teamInviteTokenSingle,
      teamInviteTokenRace,
    },
    host: {
      tenantId: hostTenantId,
      propertyId,
      propertyInviteTokenCleaner,
      propertyInviteTokenManager,
    },
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log("QA tokens generados:");
  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

