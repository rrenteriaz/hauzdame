-- SECTION A: Usuarios target (cleaner1, cleaner4)
SELECT
  u.id AS user_id,
  u.email,
  u."tenantId" AS tenant_id,
  t.slug AS tenant_slug,
  t.name AS tenant_name,
  cp.id AS cleaner_profile_id
FROM "User" u
LEFT JOIN "Tenant" t ON t.id = u."tenantId"
LEFT JOIN "CleanerProfile" cp ON cp."userId" = u.id
WHERE u.email IN ('cleaner1@hausdame.test', 'cleaner4@hausdame.test', 'cleaner2@hausdame.test', 'cleaner3@hausdame.test')
ORDER BY u.email;

-- SECTION B: Team "Mi equipo" anclado por User -> Tenant
SELECT
  tm.id AS team_id,
  tm.name AS team_name,
  tm."tenantId" AS tenant_id,
  t.slug AS tenant_slug,
  u.email AS user_email
FROM "User" u
JOIN "Tenant" t ON t.id = u."tenantId"
JOIN "Team" tm ON tm."tenantId" = u."tenantId" AND tm.name = 'Mi equipo'
WHERE u.email IN ('cleaner1@hausdame.test', 'cleaner4@hausdame.test', 'cleaner2@hausdame.test', 'cleaner3@hausdame.test')
ORDER BY u.email, tm.id;

-- SECTION C: TeamMembership anclado por User -> Tenant -> Team
SELECT
  tmem.id AS membership_id,
  tmem.status,
  tmem.role,
  tmem."createdAt",
  tmem."teamId" AS team_id,
  tm."tenantId" AS team_tenant_id,
  u."tenantId" AS user_tenant_id,
  u.email AS user_email
FROM "User" u
JOIN "Team" tm ON tm."tenantId" = u."tenantId" AND tm.name = 'Mi equipo'
JOIN "TeamMembership" tmem ON tmem."teamId" = tm.id AND tmem."userId" = u.id
WHERE u.email IN ('cleaner1@hausdame.test', 'cleaner4@hausdame.test', 'cleaner2@hausdame.test', 'cleaner3@hausdame.test')
ORDER BY u.email, tmem."createdAt";

-- SECTION D: Confirmacion explicita de tenant != DEMO_TENANT_ID (cleaner1, cleaner4)
SELECT
  u.id AS user_id,
  u.email,
  u."tenantId" AS tenant_id,
  (u."tenantId" <> 'cmk08fbgc0000coo774v2fymk') AS tenant_is_not_demo
FROM "User" u
WHERE u.email IN ('cleaner1@hausdame.test', 'cleaner4@hausdame.test', 'cleaner2@hausdame.test', 'cleaner3@hausdame.test')
ORDER BY u.email;

-- SECTION E: Usuarios no-target (cleaner2, cleaner3) para confirmar sin cambios
SELECT
  u.id AS user_id,
  u.email,
  u."tenantId" AS tenant_id,
  t.slug AS tenant_slug,
  t.name AS tenant_name,
  cp.id AS cleaner_profile_id
FROM "User" u
LEFT JOIN "Tenant" t ON t.id = u."tenantId"
LEFT JOIN "CleanerProfile" cp ON cp."userId" = u.id
WHERE u.email IN ('cleaner2@hausdame.test', 'cleaner3@hausdame.test')
ORDER BY u.email;

-- SECTION F: Memberships intactas en tenant host ranferi-airbnb (cleaner2, cleaner3)
SELECT
  u.email,
  tm.name AS team_name,
  t.slug AS tenant_slug
FROM "TeamMembership" tmem
JOIN "User" u ON u.id = tmem."userId"
JOIN "Team" tm ON tm.id = tmem."teamId"
JOIN "Tenant" t ON t.id = tm."tenantId"
WHERE u.email IN ('cleaner2@hausdame.test', 'cleaner3@hausdame.test')
  AND t.slug = 'ranferi-airbnb'
ORDER BY u.email, tm.name;

-- NOTE: In Postgres, camelCase identifiers require double-quotes ("tenantId").

