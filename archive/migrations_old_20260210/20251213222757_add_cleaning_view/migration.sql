-- CreateTable
CREATE TABLE "CleaningView" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cleaningId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CleaningView_tenantId_idx" ON "CleaningView"("tenantId");

-- CreateIndex
CREATE INDEX "CleaningView_cleaningId_idx" ON "CleaningView"("cleaningId");

-- CreateIndex
CREATE INDEX "CleaningView_memberId_idx" ON "CleaningView"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "CleaningView_cleaningId_memberId_key" ON "CleaningView"("cleaningId", "memberId");

-- AddForeignKey
ALTER TABLE "CleaningView" ADD CONSTRAINT "CleaningView_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningView" ADD CONSTRAINT "CleaningView_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningView" ADD CONSTRAINT "CleaningView_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
