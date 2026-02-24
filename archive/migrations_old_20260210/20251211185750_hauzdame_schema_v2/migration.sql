/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,provider,providerLockId]` on the table `Lock` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `providerLockId` to the `Lock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `Property` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LockProvider" AS ENUM ('TTLOCK', 'TUYA', 'OTHER');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'HANDYMAN';

-- DropIndex
DROP INDEX "Lock_tenantId_ttlockId_key";

-- AlterTable
ALTER TABLE "Lock" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "provider" "LockProvider" NOT NULL DEFAULT 'TTLOCK',
ADD COLUMN     "providerConfig" JSONB,
ADD COLUMN     "providerLockId" TEXT NOT NULL,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "ttlockId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "ownerId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PropertyAdmin" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyCleaner" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyCleaner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyHandyman" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyHandyman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyAdmin_tenantId_idx" ON "PropertyAdmin"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyAdmin_propertyId_userId_key" ON "PropertyAdmin"("propertyId", "userId");

-- CreateIndex
CREATE INDEX "PropertyCleaner_tenantId_idx" ON "PropertyCleaner"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyCleaner_propertyId_userId_key" ON "PropertyCleaner"("propertyId", "userId");

-- CreateIndex
CREATE INDEX "PropertyHandyman_tenantId_idx" ON "PropertyHandyman"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyHandyman_propertyId_userId_key" ON "PropertyHandyman"("propertyId", "userId");

-- CreateIndex
CREATE INDEX "MetricEvent_tenantId_type_idx" ON "MetricEvent"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Lock_tenantId_provider_providerLockId_idx" ON "Lock"("tenantId", "provider", "providerLockId");

-- CreateIndex
CREATE UNIQUE INDEX "Lock_tenantId_provider_providerLockId_key" ON "Lock"("tenantId", "provider", "providerLockId");

-- CreateIndex
CREATE INDEX "Property_tenantId_idx" ON "Property"("tenantId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAdmin" ADD CONSTRAINT "PropertyAdmin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAdmin" ADD CONSTRAINT "PropertyAdmin_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAdmin" ADD CONSTRAINT "PropertyAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyCleaner" ADD CONSTRAINT "PropertyCleaner_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyCleaner" ADD CONSTRAINT "PropertyCleaner_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyCleaner" ADD CONSTRAINT "PropertyCleaner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyHandyman" ADD CONSTRAINT "PropertyHandyman_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyHandyman" ADD CONSTRAINT "PropertyHandyman_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyHandyman" ADD CONSTRAINT "PropertyHandyman_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricEvent" ADD CONSTRAINT "MetricEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
