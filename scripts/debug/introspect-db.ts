import "dotenv/config";
import prisma from "@/lib/prisma";

/**
 * Introspección DB (solo lectura).
 * IMPORTANT: Casteamos a text para evitar error del Neon adapter con tipo Postgres "name".
 */

async function main() {
  console.log("▶️ Introspect DB (public schema)\n");

  // 1) List tables (cast tablename::text)
  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(`
    SELECT tablename::text AS tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);

  console.log("=== Tables (public) ===");
  console.table(tables);

  // 2) Property columns (cast to text)
  const propertyCols = await prisma.$queryRawUnsafe<
    Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>
  >(`
    SELECT
      column_name::text AS column_name,
      data_type::text AS data_type,
      is_nullable::text AS is_nullable,
      column_default::text AS column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Property'
    ORDER BY ordinal_position;
  `);

  console.log("\n=== Columns: Property ===");
  console.table(propertyCols);

  // 3) Reservation columns (cast to text)
  const reservationCols = await prisma.$queryRawUnsafe<
    Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>
  >(`
    SELECT
      column_name::text AS column_name,
      data_type::text AS data_type,
      is_nullable::text AS is_nullable,
      column_default::text AS column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Reservation'
    ORDER BY ordinal_position;
  `);

  console.log("\n=== Columns: Reservation ===");
  console.table(reservationCols);

  // 4) Foreign keys involving Property/Reservation (cast all to text)
  const fks = await prisma.$queryRawUnsafe<
    Array<{
      table_name: string;
      constraint_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>
  >(`
    SELECT
      tc.table_name::text AS table_name,
      tc.constraint_name::text AS constraint_name,
      kcu.column_name::text AS column_name,
      ccu.table_name::text AS foreign_table_name,
      ccu.column_name::text AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND (ccu.table_name IN ('Property', 'Reservation') OR tc.table_name IN ('Property', 'Reservation'))
    ORDER BY tc.table_name, tc.constraint_name;
  `);

  console.log("\n=== Foreign Keys involving Property/Reservation ===");
  console.table(fks);

  console.log("\n✅ Done.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
