// scripts/backfill-thread-participants.ts
// Script para agregar Host (owner/admin) como participants en threads existentes
// Ejecutar: npx tsx scripts/backfill-thread-participants.ts [--dry-run]

import prisma from "../lib/prisma";
import { createId } from "@paralleldrive/cuid2";

const DRY_RUN = process.argv.includes("--dry-run");

async function backfill() {
  console.log(`\n=== BACKFILL THREAD PARTICIPANTS ===`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (will modify DB)"}\n`);

  // Obtener todos los threads con propertyId
  const threads = await (prisma as any).chatThread.findMany({
    where: {
      propertyId: { not: null },
    },
    include: {
      property: {
        select: {
          id: true,
          userId: true,
          admins: {
            select: { userId: true },
          },
        },
      },
      participants: {
        where: { leftAt: null },
        select: {
          userId: true,
        },
      },
    },
  });

  console.log(`Found ${threads.length} threads with propertyId\n`);

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const thread of threads) {
    if (!thread.property) {
      console.log(`⚠️  Thread ${thread.id}: Property not found, skipping`);
      skipped++;
      continue;
    }

    const existingParticipantIds = new Set(
      thread.participants.map((p: any) => p.userId)
    );

    const missingParticipants: string[] = [];

    // Verificar owner
    if (thread.property.userId) {
      if (!existingParticipantIds.has(thread.property.userId)) {
        missingParticipants.push(thread.property.userId);
      }
    }

    // Verificar admins
    if (thread.property.admins && thread.property.admins.length > 0) {
      for (const admin of thread.property.admins) {
        if (admin.userId && !existingParticipantIds.has(admin.userId)) {
          missingParticipants.push(admin.userId);
        }
      }
    }

    if (missingParticipants.length === 0) {
      skipped++;
      continue;
    }

    console.log(`Thread ${thread.id}:`);
    console.log(`  Property: ${thread.property.id}`);
    console.log(`  Existing participants: ${existingParticipantIds.size}`);
    console.log(`  Missing participants: ${missingParticipants.length}`);
    console.log(`  Missing userIds: ${missingParticipants.join(", ")}`);

    if (!DRY_RUN) {
      try {
        // Verificar que los users existen antes de agregarlos
        const validUserIds: string[] = [];
        for (const userId of missingParticipants) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
          });
          if (user) {
            validUserIds.push(userId);
          } else {
            console.log(`    ⚠️  User ${userId} no existe, omitiendo`);
          }
        }

        if (validUserIds.length > 0) {
          await Promise.all(
            validUserIds.map((userId) =>
              (prisma as any).chatParticipant.create({
                data: {
                  id: createId(),
                  threadId: thread.id,
                  userId,
                },
              })
            )
          );
          console.log(`  ✅ Added ${validUserIds.length} participants`);
          fixed++;
        } else {
          console.log(`  ⚠️  No valid users to add`);
          skipped++;
        }
      } catch (error: any) {
        console.error(`  ❌ Error: ${error.message}`);
        errors++;
      }
    } else {
      console.log(`  [DRY RUN] Would add ${missingParticipants.length} participants`);
      fixed++;
    }
    console.log("");
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Total threads: ${threads.length}`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Skipped (already correct): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log("");

  if (DRY_RUN) {
    console.log("💡 Run without --dry-run to apply changes\n");
  }
}

backfill()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

