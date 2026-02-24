-- A) Home tenant del usuario vs tenants donde tiene memberships activas
SELECT
  u.email,
  u."tenantId" AS home_tenant_id,
  ht.slug AS home_tenant_slug,
  array_agg(DISTINCT t.slug) FILTER (WHERE t.slug IS NOT NULL) AS membership_tenant_slugs
FROM "User" u
LEFT JOIN "Tenant" ht ON ht.id = u."tenantId"
LEFT JOIN "TeamMembership" tm ON tm."userId" = u.id AND tm.status = 'ACTIVE'
LEFT JOIN "Team" team ON team.id = tm."teamId"
LEFT JOIN "Tenant" t ON t.id = team."tenantId"
WHERE u.email IN ('cleaner2@hausdame.test','cleaner3@hausdame.test')
GROUP BY u.email, u."tenantId", ht.slug
ORDER BY u.email;

-- B) Cleanings donde aparecen como assignedMembershipId (si aplica) y el tenant de esos cleanings
SELECT
  u.email,
  c.id AS cleaning_id,
  c."tenantId" AS cleaning_tenant_id,
  ct.slug AS cleaning_tenant_slug,
  c."assignmentStatus",
  c."attentionReason",
  c."assignedMembershipId",
  c."createdAt"
FROM "Cleaning" c
JOIN "TeamMembership" tm ON tm.id = c."assignedMembershipId"
JOIN "User" u ON u.id = tm."userId"
LEFT JOIN "Tenant" ct ON ct.id = c."tenantId"
WHERE u.email IN ('cleaner2@hausdame.test','cleaner3@hausdame.test')
ORDER BY u.email, c."createdAt" DESC;

-- C) PropertyMemberAccess para esas memberships (prueba de que el acceso existe en el HOST)
SELECT
  u.email,
  pma.id AS access_id,
  pma.status,
  pma."propertyId",
  pma."teamMembershipId",
  pma."createdAt"
FROM "PropertyMemberAccess" pma
JOIN "TeamMembership" tm ON tm.id = pma."teamMembershipId"
JOIN "User" u ON u.id = tm."userId"
WHERE u.email IN ('cleaner2@hausdame.test','cleaner3@hausdame.test')
ORDER BY u.email, pma."createdAt" DESC;

