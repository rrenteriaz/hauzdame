-- CreateTable
CREATE TABLE "VariantGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariantGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantOption" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "valueNormalized" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariantOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItemVariantGroup" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "optionAllowlist" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItemVariantGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VariantGroup_tenantId_key_key" ON "VariantGroup"("tenantId", "key");

-- CreateIndex
CREATE INDEX "VariantGroup_tenantId_idx" ON "VariantGroup"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantOption_groupId_valueNormalized_key" ON "VariantOption"("groupId", "valueNormalized");

-- CreateIndex
CREATE INDEX "VariantOption_groupId_idx" ON "VariantOption"("groupId");

-- CreateIndex
CREATE INDEX "VariantOption_groupId_isArchived_idx" ON "VariantOption"("groupId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItemVariantGroup_itemId_groupId_key" ON "InventoryItemVariantGroup"("itemId", "groupId");

-- CreateIndex
CREATE INDEX "InventoryItemVariantGroup_itemId_idx" ON "InventoryItemVariantGroup"("itemId");

-- CreateIndex
CREATE INDEX "InventoryItemVariantGroup_groupId_idx" ON "InventoryItemVariantGroup"("groupId");

-- AddForeignKey
ALTER TABLE "VariantGroup" ADD CONSTRAINT "VariantGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantOption" ADD CONSTRAINT "VariantOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "VariantGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItemVariantGroup" ADD CONSTRAINT "InventoryItemVariantGroup_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItemVariantGroup" ADD CONSTRAINT "InventoryItemVariantGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "VariantGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
