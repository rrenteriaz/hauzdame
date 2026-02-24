import "dotenv/config";
import prisma from "@/lib/prisma";
import { resolveEffectiveTeamsForProperty } from "@/lib/workgroups/resolveEffectiveTeamsForProperty";

type Args = {
  apply: boolean;
  hostTenantId?: string;
  propertyId?: string;
  teamId?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--apply") {
      args.apply = true;
      continue;
    }
    if (token === "--hostTenantId") {
      args.hostTenantId = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--propertyId") {
      args.propertyId = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--teamId") {
      args.teamId = argv[i + 1];
      i += 1;
      continue;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.hostTenantId) {
    console.error("error: --hostTenantId es requerido");
    process.exit(1);
  }
  console.log("mode:", args.apply ? "apply" : "dry-run");
  console.log("filters:", {
    hostTenantId: args.hostTenantId ?? null,
    propertyId: args.propertyId ?? null,
    teamId: args.teamId ?? null,
  });

  let propertyIds: string[] = [];
  if (args.propertyId) {
    propertyIds = [args.propertyId];
  } else {
    const hostWhere = { tenantId: args.hostTenantId };
    const wgProps = await prisma.hostWorkGroupProperty.findMany({
      where: hostWhere,
      select: { propertyId: true },
    });
    const legacyProps = await (prisma as any).propertyTeam.findMany({
      where: hostWhere,
      select: { propertyId: true },
    });
    propertyIds = Array.from(
      new Set([
        ...wgProps.map((p) => p.propertyId),
        ...legacyProps.map((p: any) => p.propertyId),
      ])
    );
  }

  console.log("propertyIds:", propertyIds.length);

  let propertiesScanned = 0;
  let teamsScanned = 0;
  let created = 0;
  let skippedExists = 0;
  let skippedNotSingleMember = 0;
  let skippedNotEffectiveTeam = 0;
  let skippedErrors = 0;

  for (const propertyId of propertyIds) {
    propertiesScanned += 1;
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true },
      });
      if (!property) {
        console.log("skip: property not found", { propertyId });
        skippedErrors += 1;
        continue;
      }

      const hostTenantId = args.hostTenantId;
      const effective = await resolveEffectiveTeamsForProperty(
        hostTenantId,
        propertyId
      );
      const effectiveTeamIds = args.teamId
        ? effective.teamIds.filter((id) => id === args.teamId)
        : effective.teamIds;

      if (args.teamId && effective.teamIds.length > 0 && effectiveTeamIds.length === 0) {
        skippedNotEffectiveTeam += 1;
        console.log("skip: teamId not in effective teams", {
          propertyId,
          hostTenantId,
          teamId: args.teamId,
          source: effective.source,
        });
        continue;
      }

      if (effectiveTeamIds.length === 0) {
        skippedNotEffectiveTeam += 1;
        console.log("skip: no effective teams", {
          propertyId,
          hostTenantId,
          source: effective.source,
        });
        continue;
      }

      for (const teamId of effectiveTeamIds) {
        teamsScanned += 1;
        const memberships = await prisma.teamMembership.findMany({
          where: {
            teamId,
            status: "ACTIVE",
            role: { in: ["CLEANER", "TEAM_LEADER"] },
          },
          select: { id: true },
        });

        if (memberships.length !== 1) {
          skippedNotSingleMember += 1;
          console.log("skip: team does not have exactly 1 active member", {
            propertyId,
            teamId,
            count: memberships.length,
          });
          continue;
        }

        const membershipId = memberships[0].id;
        const existing = await prisma.propertyMemberAccess.findFirst({
          where: {
            propertyId,
            teamMembershipId: membershipId,
            status: "ACTIVE",
          },
          select: { id: true },
        });

        if (existing) {
          skippedExists += 1;
          console.log("skip: PMA exists", {
            propertyId,
            teamId,
            membershipId,
            pmaId: existing.id,
          });
          continue;
        }

        if (args.apply) {
          const createdPma = await prisma.propertyMemberAccess.create({
            data: {
              propertyId,
              teamMembershipId: membershipId,
              status: "ACTIVE",
            },
            select: { id: true },
          });
          created += 1;
          console.log("create: PMA", {
            propertyId,
            teamId,
            membershipId,
            pmaId: createdPma.id,
          });
        } else {
          created += 1;
          console.log("create: PMA (dry-run)", {
            propertyId,
            teamId,
            membershipId,
          });
        }
      }
    } catch (error) {
      skippedErrors += 1;
      console.error("error: property processing failed", {
        propertyId,
        error,
      });
      continue;
    }
  }

  console.log("summary:", {
    propertiesScanned,
    teamsScanned,
    created,
    skippedExists,
    skippedNotSingleMember,
    skippedNotEffectiveTeam,
    skippedErrors,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

