-- CreateEnum
CREATE TYPE "PropertyMemberAccessStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "PropertyMemberAccess" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "teamMembershipId" TEXT NOT NULL,
    "status" "PropertyMemberAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyMemberAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyMemberAccess_propertyId_teamMembershipId_key" ON "PropertyMemberAccess"("propertyId", "teamMembershipId");

-- CreateIndex
CREATE INDEX "PropertyMemberAccess_teamMembershipId_idx" ON "PropertyMemberAccess"("teamMembershipId");

-- CreateIndex
CREATE INDEX "PropertyMemberAccess_propertyId_idx" ON "PropertyMemberAccess"("propertyId");

-- AddForeignKey
ALTER TABLE "PropertyMemberAccess" ADD CONSTRAINT "PropertyMemberAccess_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMemberAccess" ADD CONSTRAINT "PropertyMemberAccess_teamMembershipId_fkey" FOREIGN KEY ("teamMembershipId") REFERENCES "TeamMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

