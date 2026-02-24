-- CreateEnum
CREATE TYPE "WorkGroupExecutorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "HostWorkGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostWorkGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostWorkGroupProperty" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workGroupId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostWorkGroupProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkGroupExecutor" (
    "id" TEXT NOT NULL,
    "hostTenantId" TEXT NOT NULL,
    "workGroupId" TEXT NOT NULL,
    "servicesTenantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "status" "WorkGroupExecutorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkGroupExecutor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HostWorkGroup_tenantId_idx" ON "HostWorkGroup"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "HostWorkGroup_tenantId_name_key" ON "HostWorkGroup"("tenantId", "name");

-- CreateIndex
CREATE INDEX "HostWorkGroupProperty_tenantId_idx" ON "HostWorkGroupProperty"("tenantId");

-- CreateIndex
CREATE INDEX "HostWorkGroupProperty_propertyId_idx" ON "HostWorkGroupProperty"("propertyId");

-- CreateIndex
CREATE INDEX "HostWorkGroupProperty_workGroupId_idx" ON "HostWorkGroupProperty"("workGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "HostWorkGroupProperty_tenantId_workGroupId_propertyId_key" ON "HostWorkGroupProperty"("tenantId", "workGroupId", "propertyId");

-- CreateIndex
CREATE INDEX "WorkGroupExecutor_hostTenantId_idx" ON "WorkGroupExecutor"("hostTenantId");

-- CreateIndex
CREATE INDEX "WorkGroupExecutor_servicesTenantId_idx" ON "WorkGroupExecutor"("servicesTenantId");

-- CreateIndex
CREATE INDEX "WorkGroupExecutor_teamId_idx" ON "WorkGroupExecutor"("teamId");

-- CreateIndex
CREATE INDEX "WorkGroupExecutor_workGroupId_idx" ON "WorkGroupExecutor"("workGroupId");

-- CreateIndex
CREATE INDEX "WorkGroupExecutor_status_idx" ON "WorkGroupExecutor"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkGroupExecutor_hostTenantId_workGroupId_teamId_key" ON "WorkGroupExecutor"("hostTenantId", "workGroupId", "teamId");

-- AddForeignKey
ALTER TABLE "HostWorkGroup" ADD CONSTRAINT "HostWorkGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupProperty" ADD CONSTRAINT "HostWorkGroupProperty_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupProperty" ADD CONSTRAINT "HostWorkGroupProperty_workGroupId_fkey" FOREIGN KEY ("workGroupId") REFERENCES "HostWorkGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostWorkGroupProperty" ADD CONSTRAINT "HostWorkGroupProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkGroupExecutor" ADD CONSTRAINT "WorkGroupExecutor_hostTenantId_fkey" FOREIGN KEY ("hostTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkGroupExecutor" ADD CONSTRAINT "WorkGroupExecutor_servicesTenantId_fkey" FOREIGN KEY ("servicesTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkGroupExecutor" ADD CONSTRAINT "WorkGroupExecutor_workGroupId_fkey" FOREIGN KEY ("workGroupId") REFERENCES "HostWorkGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkGroupExecutor" ADD CONSTRAINT "WorkGroupExecutor_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

