-- prisma/manual/rename_property_ownerId_to_userId.sql
-- Renombra columna en DB para alinear con schema.prisma

ALTER TABLE "Property" RENAME COLUMN "ownerId" TO "userId";
