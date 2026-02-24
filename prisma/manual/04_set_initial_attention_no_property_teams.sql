-- prisma/manual/04_set_initial_attention_no_property_teams.sql
-- Marca attention solo cuando la propiedad NO tiene equipos configurados.

UPDATE "Cleaning" c
SET
  "needsAttention" = true,
  "attentionReason" = 'NO_PROPERTY_TEAMS',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1
  FROM "Property" p
  WHERE p."id" = c."propertyId"
)
AND NOT EXISTS (
  SELECT 1
  FROM "PropertyTeam" pt
  WHERE pt."propertyId" = c."propertyId"
);
