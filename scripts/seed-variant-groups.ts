/**
 * Seed del grupo de variantes "Tamaño de cama" (bed_size) a nivel tenant.
 * Crea VariantGroup + VariantOption para cada tenant en dev.
 * Ejecutar: npx tsx scripts/seed-variant-groups.ts
 */

import "dotenv/config";
import prisma from "../lib/prisma";
import { normalizeKey, normalizeValue } from "../lib/normalize";

const BED_SIZE_GROUP = {
  key: "bed_size",
  label: "Tamaño de cama",
  options: [
    { value: "individual", label: "Individual" },
    { value: "matrimonial", label: "Matrimonial" },
    { value: "queen", label: "Queen" },
    { value: "king", label: "King" },
  ],
};

async function main() {
  const keyNormalized = normalizeKey(BED_SIZE_GROUP.key);
  if (!keyNormalized) {
    console.error("[seed-variant-groups] Key vacío tras normalizar");
    process.exit(1);
  }

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  if (tenants.length === 0) {
    console.log("[seed-variant-groups] No hay tenants. Nada que hacer.");
    return;
  }

  for (const tenant of tenants) {
    const existing = await prisma.variantGroup.findUnique({
      where: { tenantId_key: { tenantId: tenant.id, key: keyNormalized } },
    });

    if (existing) {
      console.log(
        `[seed-variant-groups] Grupo ${keyNormalized} ya existe en tenant ${tenant.name} (${tenant.id}). Omiso.`
      );
      continue;
    }

    const group = await prisma.variantGroup.create({
      data: {
        tenantId: tenant.id,
        key: keyNormalized,
        label: BED_SIZE_GROUP.label,
      },
    });

    for (let i = 0; i < BED_SIZE_GROUP.options.length; i++) {
      const opt = BED_SIZE_GROUP.options[i];
      const valueNorm = normalizeValue(opt.value);
      await prisma.variantOption.create({
        data: {
          groupId: group.id,
          valueNormalized: valueNorm,
          label: opt.label,
          sortOrder: i,
        },
      });
    }

    console.log(
      `[seed-variant-groups] Creado grupo ${keyNormalized} con ${BED_SIZE_GROUP.options.length} opciones para tenant ${tenant.name}`
    );
  }

  console.log("[seed-variant-groups] Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
