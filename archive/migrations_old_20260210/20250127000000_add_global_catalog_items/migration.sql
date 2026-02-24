-- CreateTable
CREATE TABLE "GlobalCatalogItem" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es-MX',
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "defaultCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalCatalogItem_locale_nameNormalized_key" ON "GlobalCatalogItem"("locale", "nameNormalized");

-- CreateIndex
CREATE INDEX "GlobalCatalogItem_locale_isActive_idx" ON "GlobalCatalogItem"("locale", "isActive");

-- CreateIndex
CREATE INDEX "GlobalCatalogItem_nameNormalized_idx" ON "GlobalCatalogItem"("nameNormalized");

