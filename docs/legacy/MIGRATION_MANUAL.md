# Migración Manual - CleaningAssignee y teamId

## Objetivo
Agregar soporte para multi-asignación de limpiezas y asociar limpiezas con equipos.

## SQL a Ejecutar

### 1. Crear enum CleaningAssigneeStatus
```sql
CREATE TYPE "CleaningAssigneeStatus" AS ENUM ('ASSIGNED', 'DECLINED');
```

### 2. Agregar columna teamId a Cleaning
```sql
ALTER TABLE "Cleaning" 
ADD COLUMN "teamId" TEXT;

-- Crear índice
CREATE INDEX "Cleaning_teamId_idx" ON "Cleaning"("teamId");

-- Agregar FK (ajustar nombre de tabla Team según tu schema)
ALTER TABLE "Cleaning" 
ADD CONSTRAINT "Cleaning_teamId_fkey" 
FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### 3. Crear tabla CleaningAssignee
```sql
CREATE TABLE "CleaningAssignee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cleaningId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "CleaningAssigneeStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedByUserId" TEXT,

    CONSTRAINT "CleaningAssignee_pkey" PRIMARY KEY ("id")
);

-- Crear índices
CREATE INDEX "CleaningAssignee_tenantId_idx" ON "CleaningAssignee"("tenantId");
CREATE INDEX "CleaningAssignee_cleaningId_idx" ON "CleaningAssignee"("cleaningId");
CREATE INDEX "CleaningAssignee_memberId_idx" ON "CleaningAssignee"("memberId");
CREATE INDEX "CleaningAssignee_status_idx" ON "CleaningAssignee"("status");

-- Crear constraint único (un miembro solo puede estar asignado una vez por limpieza)
CREATE UNIQUE INDEX "CleaningAssignee_cleaningId_memberId_key" ON "CleaningAssignee"("cleaningId", "memberId");

-- Crear FKs
ALTER TABLE "CleaningAssignee" 
ADD CONSTRAINT "CleaningAssignee_tenantId_fkey" 
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CleaningAssignee" 
ADD CONSTRAINT "CleaningAssignee_cleaningId_fkey" 
FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CleaningAssignee" 
ADD CONSTRAINT "CleaningAssignee_memberId_fkey" 
FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## Verificación

### Verificar que Cleaning tiene teamId
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Cleaning' AND column_name = 'teamId';
```

### Verificar que CleaningAssignee existe
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'CleaningAssignee';
```

### Probar insert en CleaningAssignee
```sql
-- Obtener un cleaningId y memberId válidos primero
INSERT INTO "CleaningAssignee" ("id", "tenantId", "cleaningId", "memberId", "status", "assignedAt")
VALUES ('test_' || gen_random_uuid()::text, 'TENANT_ID', 'CLEANING_ID', 'MEMBER_ID', 'ASSIGNED', NOW());
```

## Reversión (si es necesario)

```sql
-- Eliminar tabla
DROP TABLE IF EXISTS "CleaningAssignee";

-- Eliminar columna
ALTER TABLE "Cleaning" DROP COLUMN IF EXISTS "teamId";

-- Eliminar enum (solo si no hay otras referencias)
DROP TYPE IF EXISTS "CleaningAssigneeStatus";
```

## Notas para Prisma

Después de aplicar esta migración manual, crear una migración Prisma que refleje estos cambios:

```bash
npx prisma migrate dev --name add_cleaning_assignee_and_team --create-only
```

Luego editar el archivo de migración generado para que solo contenga comentarios (ya que los cambios ya están aplicados), o eliminar el contenido SQL duplicado.

