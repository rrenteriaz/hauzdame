-- CreateTable
CREATE TABLE "TeamMemberScheduleDay" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMemberScheduleDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamMemberScheduleDay_tenantId_idx" ON "TeamMemberScheduleDay"("tenantId");

-- CreateIndex
CREATE INDEX "TeamMemberScheduleDay_memberId_idx" ON "TeamMemberScheduleDay"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMemberScheduleDay_memberId_dayOfWeek_key" ON "TeamMemberScheduleDay"("memberId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "TeamMemberScheduleDay" ADD CONSTRAINT "TeamMemberScheduleDay_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberScheduleDay" ADD CONSTRAINT "TeamMemberScheduleDay_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
