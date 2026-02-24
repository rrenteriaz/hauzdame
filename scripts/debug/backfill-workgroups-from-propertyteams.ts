import "dotenv/config";
import prisma from "@/lib/prisma";

type Args = {
  apply: boolean;
  hostTenantId?: string;
  propertyId?: string;
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
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const where: Record<string, any> = {};
  if (args.hostTenantId) {
    where.tenantId = args.hostTenantId;
  }
  if (args.propertyId) {
    where.propertyId = args.propertyId;
  }

  const propertyTeams = await (prisma as any).propertyTeam.findMany({
    where,
    select: {
      id: true,
      tenantId: true,
      propertyId: true,
      teamId: true,
    },
    orderBy: [
      { tenantId: "asc" },
      { propertyId: "asc" },
      { teamId: "asc" },
    ],
  });

  console.log("mode:", args.apply ? "apply" : "dry-run");
  console.log("filters:", {
    hostTenantId: args.hostTenantId ?? null,
    propertyId: args.propertyId ?? null,
  });
  console.log("propertyTeams:", propertyTeams.length);

  let createdWorkGroups = 0;
  let createdWorkGroupProperties = 0;
  let createdWorkGroupExecutors = 0;
  let skippedWorkGroups = 0;
  let skippedWorkGroupProperties = 0;
  let skippedWorkGroupExecutors = 0;

  for (const pt of propertyTeams) {
    const team = await prisma.team.findUnique({
      where: { id: pt.teamId },
      select: { tenantId: true },
    });
    if (!team) {
      console.log("skip: team not found", {
        propertyTeamId: pt.id,
        teamId: pt.teamId,
      });
      continue;
    }

    const servicesTenantId = team.tenantId;
    const workGroupName = "WG Default";

    let workGroup = await prisma.hostWorkGroup.findFirst({
      where: {
        tenantId: pt.tenantId,
        name: { in: [workGroupName, "Default"] },
      },
      select: { id: true, name: true },
    });

    if (!workGroup) {
      if (args.apply) {
        workGroup = await prisma.hostWorkGroup.create({
          data: {
            tenantId: pt.tenantId,
            name: workGroupName,
          },
          select: { id: true, name: true },
        });
      }
      if (workGroup) {
        createdWorkGroups += 1;
        console.log("create: hostWorkGroup", {
          tenantId: pt.tenantId,
          workGroupId: workGroup.id,
          name: workGroup.name,
        });
      } else {
        console.log("create: hostWorkGroup (dry-run)", {
          tenantId: pt.tenantId,
          name: workGroupName,
        });
      }
    } else {
      skippedWorkGroups += 1;
      console.log("skip: hostWorkGroup exists", {
        tenantId: pt.tenantId,
        workGroupId: workGroup.id,
        name: workGroup.name,
      });
    }

    if (!workGroup) {
      console.log("skip: missing workGroup (dry-run create not applied)", {
        propertyTeamId: pt.id,
      });
      continue;
    }

    const existingWgp = await prisma.hostWorkGroupProperty.findFirst({
      where: {
        tenantId: pt.tenantId,
        workGroupId: workGroup.id,
        propertyId: pt.propertyId,
      },
      select: { id: true },
    });

    if (!existingWgp) {
      if (args.apply) {
        const created = await prisma.hostWorkGroupProperty.create({
          data: {
            tenantId: pt.tenantId,
            workGroupId: workGroup.id,
            propertyId: pt.propertyId,
          },
          select: { id: true },
        });
        createdWorkGroupProperties += 1;
        console.log("create: hostWorkGroupProperty", {
          id: created.id,
          tenantId: pt.tenantId,
          workGroupId: workGroup.id,
          propertyId: pt.propertyId,
        });
      } else {
        createdWorkGroupProperties += 1;
        console.log("create: hostWorkGroupProperty (dry-run)", {
          tenantId: pt.tenantId,
          workGroupId: workGroup.id,
          propertyId: pt.propertyId,
        });
      }
    } else {
      skippedWorkGroupProperties += 1;
      console.log("skip: hostWorkGroupProperty exists", {
        id: existingWgp.id,
        tenantId: pt.tenantId,
        workGroupId: workGroup.id,
        propertyId: pt.propertyId,
      });
    }

    const existingExecutor = await prisma.workGroupExecutor.findFirst({
      where: {
        hostTenantId: pt.tenantId,
        workGroupId: workGroup.id,
        teamId: pt.teamId,
      },
      select: { id: true, status: true },
    });

    if (!existingExecutor) {
      if (args.apply) {
        const created = await prisma.workGroupExecutor.create({
          data: {
            hostTenantId: pt.tenantId,
            servicesTenantId,
            workGroupId: workGroup.id,
            teamId: pt.teamId,
            status: "ACTIVE",
          },
          select: { id: true },
        });
        createdWorkGroupExecutors += 1;
        console.log("create: workGroupExecutor", {
          id: created.id,
          hostTenantId: pt.tenantId,
          servicesTenantId,
          workGroupId: workGroup.id,
          teamId: pt.teamId,
        });
      } else {
        createdWorkGroupExecutors += 1;
        console.log("create: workGroupExecutor (dry-run)", {
          hostTenantId: pt.tenantId,
          servicesTenantId,
          workGroupId: workGroup.id,
          teamId: pt.teamId,
        });
      }
    } else {
      skippedWorkGroupExecutors += 1;
      console.log("skip: workGroupExecutor exists", {
        id: existingExecutor.id,
        hostTenantId: pt.tenantId,
        workGroupId: workGroup.id,
        teamId: pt.teamId,
        status: existingExecutor.status,
      });
    }
  }

  console.log("summary:", {
    hostWorkGroups: { created: createdWorkGroups, skipped: skippedWorkGroups },
    hostWorkGroupProperties: {
      created: createdWorkGroupProperties,
      skipped: skippedWorkGroupProperties,
    },
    workGroupExecutors: {
      created: createdWorkGroupExecutors,
      skipped: skippedWorkGroupExecutors,
    },
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

