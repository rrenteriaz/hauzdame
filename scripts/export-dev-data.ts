/**
 * Exportador de datos de desarrollo
 * 
 * Exporta datos de Tenant, User, Property y Reservation antes de ejecutar
 * prisma migrate reset o cambios en el schema.
 * 
 * INSTRUCCIONES DE EJECUCIÓN:
 * 
 * Preferido:
 *   npx tsx scripts/export-dev-data.ts
 * 
 * Alternativa:
 *   npx ts-node scripts/export-dev-data.ts
 * 
 * El archivo de salida se guarda en: ./dev-export.json
 */

// Cargar variables de entorno (tsx no carga .env automáticamente como Next.js)
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Cargar .env.local primero (tiene prioridad), luego .env
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
} else if (fs.existsSync(".env")) {
  dotenv.config({ path: ".env" });
}

// Validar DATABASE_URL antes de continuar
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === "") {
  console.error("❌ Error: DATABASE_URL no está definido.");
  console.error("   Crea .env o .env.local con DATABASE_URL antes de correr el export.");
  process.exit(1);
}

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configurar Neon para usar WebSocket en Node.js
try {
  neonConfig.webSocketConstructor = ws;
} catch (error) {
  console.warn("Error configurando WebSocket para Neon:", error);
}

// Crear PrismaClient con adapter de Neon (igual que lib/prisma.ts)
const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

const OUTPUT_FILE = path.join(process.cwd(), "dev-export.json");

async function main() {
  console.log("📦 Exportando datos de desarrollo...\n");

  // Exportar todos los datos
  const [tenants, users, properties, reservations] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.property.findMany({
      orderBy: { createdAt: "asc" },
      // Incluir todos los campos relacionados con iCal
      // (icalUrl, timeZone, checkInTime, checkOutTime ya están en el modelo)
    }),
    prisma.reservation.findMany({
      orderBy: { createdAt: "asc" },
      // Incluir todos los campos relacionados con iCal
      // (calendarUid, reservationCodeCalendar, confirmationCodeEmail, etc. ya están en el modelo)
    }),
  ]);

  // Crear estructura de exportación
  const exportData = {
    exportedAt: new Date().toISOString(),
    tenants,
    users,
    properties,
    reservations,
  };

  // Escribir archivo JSON con formato (2 espacios)
  const jsonContent = JSON.stringify(exportData, null, 2);
  fs.writeFileSync(OUTPUT_FILE, jsonContent, "utf-8");

  // Mostrar resumen
  console.log("✅ Exportación completada:");
  console.log(`   Tenants: ${tenants.length}`);
  console.log(`   Users: ${users.length}`);
  console.log(`   Properties: ${properties.length}`);
  console.log(`   Reservations: ${reservations.length}`);
  console.log(`\n📄 Archivo guardado en: ${OUTPUT_FILE}`);
}

main()
  .catch((e) => {
    console.error("❌ Error durante la exportación:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

