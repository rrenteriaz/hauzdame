/**
 * Seed canónico de VariantGroups por tenant (bed_size, material, use).
 * Idempotente: upsert por tenantId+key y groupId+valueNormalized.
 *
 * Uso:
 *   npx tsx scripts/seed-tenant-variant-groups.ts              # dry-run (default)
 *   npx tsx scripts/seed-tenant-variant-groups.ts --apply       # escribir a DB
 *   npx tsx scripts/seed-tenant-variant-groups.ts --tenantId=X --apply
 */

import "dotenv/config";
import prisma from "../lib/prisma";

const DRY_RUN = !process.argv.includes("--apply");
const tenantIdArg = process.argv.find((a) => a.startsWith("--tenantId="));
const tenantIdOverride = tenantIdArg?.split("=")[1];

const CANONICAL_GROUPS = [
  {
    key: "bed_size",
    label: "Tamaño de cama",
    options: [
      { label: "Individual", valueNormalized: "individual", sortOrder: 10 },
      { label: "Matrimonial", valueNormalized: "matrimonial", sortOrder: 20 },
      { label: "Queen", valueNormalized: "queen", sortOrder: 30 },
      { label: "King", valueNormalized: "king", sortOrder: 40 },
    ],
  },
  {
    key: "material",
    label: "Material",
    options: [
      { label: "Barro", valueNormalized: "barro", sortOrder: 10 },
      { label: "Cantera", valueNormalized: "cantera", sortOrder: 20 },
      { label: "Cerámica", valueNormalized: "ceramica", sortOrder: 30 },
      { label: "MDF", valueNormalized: "mdf", sortOrder: 40 },
      { label: "Madera", valueNormalized: "madera", sortOrder: 50 },
      { label: "Metal", valueNormalized: "metal", sortOrder: 60 },
      { label: "Plástico", valueNormalized: "plastico", sortOrder: 70 },
      { label: "Tela", valueNormalized: "tela", sortOrder: 80 },
      { label: "Vidrio", valueNormalized: "vidrio", sortOrder: 90 },
    ],
  },
  {
    key: "use",
    label: "Uso",
    options: [
      { label: "Limpiar", valueNormalized: "limpiar", sortOrder: 10 },
      { label: "Secar", valueNormalized: "secar", sortOrder: 20 },
    ],
  },
];

async function main() {
  const tenant = tenantIdOverride
    ? await prisma.tenant.findUnique({ where: { id: tenantIdOverride } })
    : await prisma.tenant.findFirst();

  if (!tenant) {
    console.error("No tenant found.");
    if (tenantIdOverride) {
      console.error(`tenantId=${tenantIdOverride} not found.`);
    } else {
      console.error("Run with --tenantId=<id> or ensure at least one tenant exists.");
    }
    process.exit(1);
  }

  console.log(`Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN (use --apply to write)" : "APPLY"}`);

  for (const groupDef of CANONICAL_GROUPS) {
    let group = await prisma.variantGroup.findUnique({
      where: { tenantId_key: { tenantId: tenant.id, key: groupDef.key } },
    });

    if (!group) {
      if (DRY_RUN) {
        console.log(`[DRY] Would create group: ${groupDef.key} (${groupDef.label})`);
      } else {
        group = await prisma.variantGroup.create({
          data: {
            tenantId: tenant.id,
            key: groupDef.key,
            label: groupDef.label,
          },
        });
        console.log(`Created group: ${groupDef.key}`);
      }
    } else {
      if (!DRY_RUN) {
        await prisma.variantGroup.update({
          where: { id: group.id },
          data: { label: groupDef.label },
        });
      }
    }

    if (!group && DRY_RUN) continue;

    const gId = group!.id;

    for (const opt of groupDef.options) {
      const existing = await prisma.variantOption.findUnique({
        where: {
          groupId_valueNormalized: { groupId: gId, valueNormalized: opt.valueNormalized },
        },
      });

      if (!existing) {
        if (DRY_RUN) {
          console.log(`  [DRY] Would add option: ${opt.label} (${opt.valueNormalized})`);
        } else {
          await prisma.variantOption.create({
            data: {
              groupId: gId,
              valueNormalized: opt.valueNormalized,
              label: opt.label,
              sortOrder: opt.sortOrder,
              isArchived: false,
            },
          });
          console.log(`  Added option: ${opt.label}`);
        }
      }
    }
  }

  console.log("Done.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
