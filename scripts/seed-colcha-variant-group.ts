/**
 * Crea el grupo de variantes ejemplar "Tamaño de cama" para el item Colcha.
 * Ejecutar una vez: npx tsx scripts/seed-colcha-variant-group.ts
 */

import "dotenv/config";
import prisma from "../lib/prisma";
import { updateInventoryItem } from "../lib/inventory";
import { serializeDefaultVariantOptions, normalizeVariantKey } from "../lib/variant-group";

const BED_SIZE_PAYLOAD = {
  key: "bed_size",
  label: "Tamaño de cama",
  options: [
    { value: "Individual" },
    { value: "Matrimonial" },
    { value: "Queen" },
    { value: "King" },
  ],
};

async function main() {
  const nameNormalized = "colcha";

  const items = await prisma.inventoryItem.findMany({
    where: {
      nameNormalized,
      defaultVariantKey: null,
    },
    select: { id: true, tenantId: true, name: true },
  });

  if (items.length === 0) {
    console.log(`[seed-colcha-variant-group] No se encontró item "Colcha" sin grupo. Nada que hacer.`);
    return;
  }

  const key = normalizeVariantKey(BED_SIZE_PAYLOAD.key);
  const optionsJson = serializeDefaultVariantOptions(BED_SIZE_PAYLOAD.options);

  for (const item of items) {
    try {
      await updateInventoryItem(item.tenantId, item.id, {
        defaultVariantKey: key,
        defaultVariantLabel: BED_SIZE_PAYLOAD.label,
        defaultVariantOptions: optionsJson,
      });
      console.log(`[seed-colcha-variant-group] Grupo creado para Colcha (tenantId=${item.tenantId}, itemId=${item.id})`);
    } catch (err) {
      console.error(`[seed-colcha-variant-group] Error en item ${item.id}:`, err);
      throw err;
    }
  }

  console.log(`[seed-colcha-variant-group] Listo. ${items.length} item(s) actualizado(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
