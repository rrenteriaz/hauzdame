import "dotenv/config";
import prisma from "@/lib/prisma";

function pickDmmf(prismaClient: any) {
  return prismaClient?._dmmf || prismaClient?._baseDmmf || prismaClient?._runtimeDataModel || null;
}

function getModelsMap(dmmf: any): Record<string, any> | null {
  // En tu caso dmmf.keys = ['models','enums','types'] y dmmf.models suele ser un map
  const m = dmmf?.models;
  if (!m) return null;
  if (Array.isArray(m)) return null; // no es tu caso
  if (typeof m === "object") return m as Record<string, any>;
  return null;
}

async function main() {
  const dmmf: any = pickDmmf(prisma as any);

  if (!dmmf) {
    console.error("❌ No pude acceder al DMMF interno de Prisma en este client.");
    console.log("ℹ️ Keys en prisma:", Object.keys(prisma as any));
    return;
  }

  const modelsMap = getModelsMap(dmmf);
  if (!modelsMap) {
    console.error("❌ No pude interpretar dmmf.models como map/objeto.");
    console.log("ℹ️ DMMF keys:", Object.keys(dmmf));
    console.log("ℹ️ typeof dmmf.models:", typeof dmmf?.models);
    return;
  }

  const modelNames = Object.keys(modelsMap).sort();
  console.log("=== Modelos disponibles (dmmf.models) ===");
  console.log(modelNames.join("\n"));
  console.log("=== Total modelos ===", modelNames.length, "\n");

  // Buscar Reservation (case-insensitive)
  const exact = modelsMap["Reservation"];
  const ciKey = exact
    ? "Reservation"
    : modelNames.find((n) => n.toLowerCase() === "reservation") || null;

  if (!ciKey) {
    console.error("❌ No existe un modelo 'Reservation' en este Prisma Client.");
    console.log("ℹ️ Busca el nombre correcto en la lista anterior y ajusto el script.");
    return;
  }

  const reservationModel = modelsMap[ciKey];

  // Estructuras comunes:
  // reservationModel.fields (array) o reservationModel.fieldMap (objeto)
  const fieldsArray: any[] =
    Array.isArray(reservationModel?.fields)
      ? reservationModel.fields
      : reservationModel?.fieldMap && typeof reservationModel.fieldMap === "object"
        ? Object.values(reservationModel.fieldMap)
        : [];

  if (!Array.isArray(fieldsArray) || fieldsArray.length === 0) {
    console.error("❌ No pude obtener fields del modelo Reservation desde dmmf.models.");
    console.log("ℹ️ Keys del modelo:", reservationModel ? Object.keys(reservationModel) : null);
    return;
  }

  const scalarFields = fieldsArray
    .filter((f: any) => f?.kind === "scalar" || f?.kind === "enum") // enum también es columna escalar en DB
    .map((f: any) => ({
      name: f.name,
      kind: f.kind,
      type: f.type,
      isRequired: f.isRequired ?? (!f.isNullable),
      isList: !!f.isList,
      hasDefault: !!f.hasDefaultValue,
    }));

  console.log(`=== Columnas escalares del modelo ${ciKey} ===\n`);

  for (const f of scalarFields) {
    console.log(
      `${String(f.name).padEnd(32)}  kind=${String(f.kind).padEnd(6)}  type=${String(f.type).padEnd(
        14
      )}  required=${String(!!f.isRequired).padEnd(5)}  list=${String(f.isList).padEnd(
        5
      )}  default=${String(f.hasDefault).padEnd(5)}`
    );
  }

  console.log("\n=== Total columnas ===", scalarFields.length);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
