import "dotenv/config";
import prisma from "../../lib/prisma";
import { resolveEffectiveTeamsForProperty } from "../../lib/workgroups/resolveEffectiveTeamsForProperty";

type Args = {
  apply: boolean;
  hostTenantId?: string;
  propertyId?: string;
  fromTeamId?: string;
  toTeamId?: string;
  onlyAssigned: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    apply: false,
    onlyAssigned: true,
  };

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
    if (token === "--fromTeamId") {
      args.fromTeamId = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--toTeamId") {
      args.toTeamId = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--onlyAssigned") {
      const value = argv[i + 1];
      if (value === "false") {
        args.onlyAssigned = false;
        i += 1;
      } else if (value === "true") {
        args.onlyAssigned = true;
        i += 1;
      } else {
        args.onlyAssigned = true;
      }
      continue;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.toTeamId && !args.hostTenantId) {
    console.error("error: --hostTenantId es requerido cuando no se pasa --toTeamId");
    process.exit(1);
  }
  console.log("mode:", args.apply ? "apply" : "dry-run");
  console.log("filters:", {
    hostTenantId: args.hostTenantId ?? null,
    propertyId: args.propertyId ?? null,
    fromTeamId: args.fromTeamId ?? null,
    toTeamId: args.toTeamId ?? null,
    onlyAssigned: args.onlyAssigned,
  });

  const where: Record<string, unknown> = {
    teamId: { not: null },
  };
  if (args.propertyId) {
    where.propertyId = args.propertyId;
  }
  if (args.fromTeamId) {
    where.teamId = args.fromTeamId;
  }
  if (args.hostTenantId) {
    where.tenantId = args.hostTenantId;
  }
  if (args.onlyAssigned) {
    where.assignmentStatus = "ASSIGNED";
  }

  const cleanings = await prisma.cleaning.findMany({
    where,
    select: {
      id: true,
      propertyId: true,
      teamId: true,
      assignedMembershipId: true,
      status: true,
      assignmentStatus: true,
      tenantId: true,
    },
  });

  let scanned = 0;
  let updated = 0;
  let skippedAlreadyOk = 0;
  let skippedNotMatch = 0;
  let skippedErrors = 0;

  const teamCache = new Map<string, { tenantId: string } | null>();

  for (const cleaning of cleanings) {
    scanned += 1;
    try {
      const prevTeamId = cleaning.teamId;
      if (!prevTeamId) {
        skippedNotMatch += 1;
        continue;
      }

      if (args.toTeamId && prevTeamId === args.toTeamId) {
        skippedAlreadyOk += 1;
        continue;
      }

      if (args.fromTeamId && prevTeamId !== args.fromTeamId) {
        skippedNotMatch += 1;
        continue;
      }

      let team = teamCache.get(prevTeamId);
      if (team === undefined) {
        team = await prisma.team.findUnique({
          where: { id: prevTeamId },
          select: { tenantId: true },
        });
        teamCache.set(prevTeamId, team ?? null);
      }

      if (!team) {
        skippedNotMatch += 1;
        continue;
      }

      if (args.hostTenantId && team.tenantId !== args.hostTenantId) {
        skippedNotMatch += 1;
        continue;
      }

      let nextTeamId = args.toTeamId ?? null;
      if (!nextTeamId) {
        const effective = await resolveEffectiveTeamsForProperty(
          args.hostTenantId as string,
          cleaning.propertyId
        );
        const serviceTeamIds: string[] = [];
        for (const teamId of effective.teamIds) {
          let effectiveTeam = teamCache.get(teamId);
          if (effectiveTeam === undefined) {
            effectiveTeam = await prisma.team.findUnique({
              where: { id: teamId },
              select: { tenantId: true },
            });
            teamCache.set(teamId, effectiveTeam ?? null);
          }
          if (effectiveTeam && effectiveTeam.tenantId !== args.hostTenantId) {
            serviceTeamIds.push(teamId);
          }
        }

        if (serviceTeamIds.length === 1) {
          nextTeamId = serviceTeamIds[0];
        } else if (serviceTeamIds.length === 0) {
          console.log("skip: no service team for property", {
            cleaningId: cleaning.id,
            propertyId: cleaning.propertyId,
            source: effective.source,
            teamIds: effective.teamIds,
          });
          skippedNotMatch += 1;
          continue;
        } else {
          console.log("skip: multiple service teams, pass --toTeamId", {
            cleaningId: cleaning.id,
            propertyId: cleaning.propertyId,
            serviceTeamIds,
            source: effective.source,
          });
          skippedNotMatch += 1;
          continue;
        }
      } else if (args.hostTenantId) {
        const effective = await resolveEffectiveTeamsForProperty(
          args.hostTenantId,
          cleaning.propertyId
        );
        if (effective.source === "WORKGROUP") {
          if (!effective.teamIds.includes(nextTeamId)) {
            console.log("skip: toTeamId not in WORKGROUP effective teams", {
              cleaningId: cleaning.id,
              propertyId: cleaning.propertyId,
              toTeamId: nextTeamId,
              teamIds: effective.teamIds,
            });
            skippedNotMatch += 1;
            continue;
          }
        }
      }

      if (!nextTeamId) {
        skippedNotMatch += 1;
        continue;
      }
      const nextAssignedMembershipId = null;

      const payload = {
        cleaningId: cleaning.id,
        propertyId: cleaning.propertyId,
        prevTeamId,
        prevAssignedMembershipId: cleaning.assignedMembershipId,
        nextTeamId,
        nextAssignedMembershipId,
        status: cleaning.status,
        assignmentStatus: cleaning.assignmentStatus,
      };

      if (args.apply) {
        await prisma.cleaning.update({
          where: { id: cleaning.id },
          data: {
            teamId: nextTeamId,
            assignedMembershipId: null,
          },
        });
      }

      updated += 1;
      console.log(payload);
    } catch (error) {
      skippedErrors += 1;
      console.error("error: cleaning update failed", {
        cleaningId: cleaning.id,
        error,
      });
    }
  }

  console.log("summary:", {
    scanned,
    updated,
    skippedAlreadyOk,
    skippedNotMatch,
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

