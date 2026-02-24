  // scripts/seed-properties.ts
  import { config } from "dotenv";
  import { resolve } from "path";

  // Cargar variables de entorno
  config({ path: resolve(process.cwd(), ".env") });

  import prisma from "../lib/prisma";

  async function main() {
    // Obtener el tenant por defecto
    const tenant = await prisma.tenant.findFirst({
      where: { slug: "default" },
    });

    if (!tenant) {
      console.error("No se encontró el tenant por defecto. Por favor crea uno primero.");
      process.exit(1);
    }

    // Obtener o crear el owner por defecto
    let owner = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        role: "OWNER",
      },
    });

    if (!owner) {
      // Crear un owner por defecto si no existe
      owner = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: `owner@${tenant.slug}.com`,
          name: "Propietario por defecto",
          role: "OWNER",
        },
      });
    }

    const properties = [
      {
        id: "5068bc75",
        name: "Céntrica, acogedora y muy amplia 1 recamara en PB",
        shortName: "CasaL",
        icalUrl: "https://www.airbnb.mx/calendar/ical/1249381503627289316.ics?s=f9a29018c204c4155784cf287778a792",
        checkInTime: "16:00",
        checkOutTime: "11:00",
        groupName: "Centro",
      },
      {
        id: "aa74b470",
        name: "Magnífico y cómodo 2 R 4 C",
        shortName: "Depa01",
        icalUrl: "https://www.airbnb.mx/calendar/ical/54143637.ics?s=af5ff61ca1fa926e9046b76bb23e2968",
        checkInTime: "16:00",
        checkOutTime: "11:00",
        groupName: "Villas",
      },
      {
        id: "b473f057",
        name: "Ubicación y comodidad 2R 2C",
        shortName: "Depa02",
        icalUrl: "https://www.airbnb.mx/calendar/ical/910257447530034367.ics?s=40b3be8810df1b3c1090df62ac80c105",
        checkInTime: "16:00",
        checkOutTime: "11:00",
        groupName: "Villas",
      },
      {
        id: "9a29b6a2",
        name: "Único Cómodo y Elegante 2 R 4 C",
        shortName: "Depa03",
        icalUrl: "https://www.airbnb.mx/calendar/ical/1308866430251351930.ics?s=c37fcd299c216720b515120443085cd4",
        checkInTime: "16:00",
        checkOutTime: "11:00",
        groupName: "Villas",
      },
      {
        id: "f6caad7d",
        name: "Ideal para ejecutivos 2 R 4 C",
        shortName: "Depa04",
        icalUrl: "https://www.airbnb.mx/calendar/ical/1352466084459112681.ics?s=e0e561510c06a8297221c122a3191970",
        checkInTime: "16:00",
        checkOutTime: "11:00",
        groupName: "Villas",
      },
      {
        id: "11a142fc",
        name: "Planta Baja Acogedor y cómodo",
        shortName: "Depa05",
        icalUrl: "https://www.airbnb.mx/calendar/ical/1446037280049650378.ics?s=58df70fb03552a1190bbc39e80d25de7",
        checkInTime: "16:00",
        checkOutTime: "11:00",
        groupName: "Villas",
      },
      {
        id: "b8788ac0",
        name: "Ejecutivo y Familiar 2 R 4 C",
        shortName: "Depa06",
        icalUrl: "https://www.airbnb.mx/calendar/ical/1485780252247268009.ics?s=18f06ded4f453d1154b975e3d435e4bb",
        checkInTime: "16:00",
        checkOutTime: "11:00",
        groupName: "Villas",
      },
    ];

    console.log(`Insertando ${properties.length} propiedades...`);

    for (const prop of properties) {
      try {
        // FASE 5: Usar idOld para buscar propiedades existentes (opción B)
        // El id corto (8 chars) ahora se guarda en idOld para auditoría
        const existingProperty = await prisma.property.findFirst({
          where: {
            idOld: prop.id, // Buscar por idOld (ID legacy)
            tenantId: tenant.id,
          },
        });

        if (existingProperty) {
          // Propiedad existe: actualizar
          await prisma.property.update({
            where: { id: existingProperty.id },
            data: {
              name: prop.name,
              shortName: prop.shortName,
              icalUrl: prop.icalUrl,
              checkInTime: prop.checkInTime,
              checkOutTime: prop.checkOutTime,
              groupName: prop.groupName,
            },
          });
          console.log(`✓ ${prop.shortName || prop.name} - Actualizada (idOld: ${prop.id}, id: ${existingProperty.id.slice(0, 8)}...)`);
        } else {
          // Propiedad no existe: crear nueva con idOld
        const newProperty = await (prisma as any).property.create({
            data: {
              tenantId: tenant.id,
              userId: owner.id,
              idOld: prop.id, // Guardar ID legacy en idOld para auditoría
              name: prop.name,
              shortName: prop.shortName,
              icalUrl: prop.icalUrl,
              checkInTime: prop.checkInTime,
              checkOutTime: prop.checkOutTime,
              groupName: prop.groupName,
              isActive: true,
            },
          });
          console.log(`✓ ${prop.shortName || prop.name} - Creada (idOld: ${prop.id}, id: ${newProperty.id.slice(0, 8)}...)`);
        }
      } catch (error: any) {
        console.error(`✗ Error con ${prop.shortName || prop.name} (idOld: ${prop.id}):`, error.message);
      }
    }

    console.log("\n¡Propiedades insertadas exitosamente!");
  }

  main()
    .catch((e) => {
      console.error("Error:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

