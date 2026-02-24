-- Add operational fields to Property for Host → Propiedades → Editar
ALTER TABLE "Property"
ADD COLUMN "wifiSsid" TEXT,
ADD COLUMN "wifiPassword" TEXT,
ADD COLUMN "accessCode" TEXT;


