-- CreateEnum
CREATE TYPE "HostWorkGroupInviteStatus" AS ENUM ('PENDING', 'CLAIMED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "HostWorkGroupStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_ownerId_fkey";

-- AlterTable
ALTER TABLE "HostWorkGroup" ADD COLUMN     "status" "HostWorkGroupStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "ownerId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WorkGroupExecutor" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "HostWorkGroupInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workGroupId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "HostWorkGroupInviteStatus" NOT NULL DEFAULT 'PENDING',
    "prefillName" TEXT,
    "message" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "claimedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "HostWorkGroupInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostWorkGroupInvite_token_key" ON "HostWorkGroupInvite"("token");

-- CreateIndex
CREATE INDEX "HostWorkGroupInvite_tenantId_idx" ON "HostWorkGroupInvite"("tenantId");

-- CreateIndex
CREATE INDEX "HostWorkGroupInvite_workGroupId_idx" ON "HostWorkGroupInvite"("workGroupId");

-- CreateIndex
CREATE INDEX "HostWorkGroupInvite_status_idx" ON "HostWorkGroupInvite"("status");

-- CreateIndex
CREATE INDEX "HostWorkGroupInvite_token_idx" ON "HostWorkGroupInvite"("token");

-- CreateIndex
CREATE INDEX "HostWorkGroupInvite_createdByUserId_idx" ON "HostWorkGroupInvite"("createdByUserId");

-- CreateIndex
CREATE INDEX "HostWorkGroup_status_idx" ON "HostWorkGroup"("status");

-- CreateIndex
CREATE INDEX "WorkGroupExecutor_hostTenantId_workGroupId_idx" ON "WorkGroupExecutor"("hostTenantId", "workGroupId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupInvite" ADD CONSTRAINT "HostWorkGroupInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupInvite" ADD CONSTRAINT "HostWorkGroupInvite_workGroupId_fkey" FOREIGN KEY ("workGroupId") REFERENCES "HostWorkGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupInvite" ADD CONSTRAINT "HostWorkGroupInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupInvite" ADD CONSTRAINT "HostWorkGroupInvite_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
