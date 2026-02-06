# Backfill: Migrar asignaciones legacy a CleaningAssignee

## Objetivo
Migrar todas las limpiezas que tienen `assignedMemberId` (o `assignedTeamMemberId`) pero NO tienen registro en `CleaningAssignee`.

## Mapeo
- `Cleaning.assignedMemberId` → `CleaningAssignee.memberId` (ambos son TeamMember.id)
- `Cleaning.assignedTeamMemberId` → `CleaningAssignee.memberId` (legacy, también TeamMember.id)

## Script SQL

```sql
-- Backfill: Crear CleaningAssignee para limpiezas con assignedMemberId pero sin CleaningAssignee
INSERT INTO "CleaningAssignee" (
    "id",
    "tenantId",
    "cleaningId",
    "memberId",
    "status",
    "assignedAt",
    "assignedByUserId"
)
SELECT 
    gen_random_uuid()::text as "id",
    c."tenantId",
    c."id" as "cleaningId",
    COALESCE(c."assignedMemberId", c."assignedTeamMemberId") as "memberId",
    'ASSIGNED'::"CleaningAssigneeStatus" as "status",
    COALESCE(c."updatedAt", c."createdAt") as "assignedAt",
    NULL as "assignedByUserId"
FROM "Cleaning" c
WHERE 
    -- Tiene asignación (assignedMemberId o assignedTeamMemberId)
    (c."assignedMemberId" IS NOT NULL OR c."assignedTeamMemberId" IS NOT NULL)
    -- Y NO tiene registro en CleaningAssignee
    AND NOT EXISTS (
        SELECT 1 
        FROM "CleaningAssignee" ca 
        WHERE ca."cleaningId" = c."id" 
        AND ca."status" = 'ASSIGNED'
        AND ca."memberId" = COALESCE(c."assignedMemberId", c."assignedTeamMemberId")
    )
    -- Y el memberId es válido (existe en TeamMember)
    AND EXISTS (
        SELECT 1 
        FROM "TeamMember" tm 
        WHERE tm."id" = COALESCE(c."assignedMemberId", c."assignedTeamMemberId")
        AND tm."tenantId" = c."tenantId"
    )
ON CONFLICT ("cleaningId", "memberId") DO NOTHING;
```

## Verificación

```sql
-- Contar limpiezas con assignedMemberId
SELECT COUNT(*) 
FROM "Cleaning" 
WHERE "assignedMemberId" IS NOT NULL OR "assignedTeamMemberId" IS NOT NULL;

-- Contar CleaningAssignee creados
SELECT COUNT(*) 
FROM "CleaningAssignee" 
WHERE "status" = 'ASSIGNED';

-- Verificar que todas las limpiezas con assignedMemberId tienen CleaningAssignee
SELECT COUNT(*) 
FROM "Cleaning" c
WHERE (c."assignedMemberId" IS NOT NULL OR c."assignedTeamMemberId" IS NOT NULL)
AND NOT EXISTS (
    SELECT 1 
    FROM "CleaningAssignee" ca 
    WHERE ca."cleaningId" = c."id" 
    AND ca."status" = 'ASSIGNED'
);
-- Debe retornar 0 después del backfill
```

## Ejecución

```bash
npx prisma db execute --file=backfill_assignees.sql
```

