# Backfill seguro de Services Tenant (seed cleaners)

Este script crea el tenant Services y su bootstrap para usuarios seed `cleaner1..4` de forma
segura, con preflight, dry-run y apply.

## Requisitos
- `DATABASE_URL` configurado en `.env` o `.env.local`.
- Prisma conectado a Neon (usa el mismo adapter que el resto del proyecto).

## Ejecutar

Preflight (solo lectura, default):
```
node scripts/backfillSeedServiceTenants.mjs --mode=preflight
```

Dry-run (simula cambios):
```
node scripts/backfillSeedServiceTenants.mjs --mode=dry-run
```

Apply (requiere confirmacion):
```
node scripts/backfillSeedServiceTenants.mjs --mode=apply --yes
```

Migracion controlada desde tenant demo:
```
DEMO_TENANT_ID="..." node scripts/backfillSeedServiceTenants.mjs --mode=apply --yes --allow-demo-migration
```

En preflight/dry-run tambien puedes usar `--allow-demo-migration` para ver el plan sin escribir.

Reporte JSON:
```
node scripts/backfillSeedServiceTenants.mjs --mode=dry-run --report-json=./backfill-report.json
```

Custom emails:
```
node scripts/backfillSeedServiceTenants.mjs --mode=preflight --emails cleaner1@hausdame.test,cleaner2@hausdame.test
```

Por defecto procesa:
- cleaner1@hausdame.test
- cleaner2@hausdame.test
- cleaner3@hausdame.test
- cleaner4@hausdame.test

## Guardrails
- No crea ni reutiliza tenant demo.
- Si el user tiene tenant que parece Host o demo, se bloquea ese usuario.
- `--allow-demo-migration` solo permite migrar si `DEMO_TENANT_ID` existe y coincide.
- No mueve data historica (cleanings/chats/props quedan en demo).
- Cada usuario se procesa en una transaccion independiente.
- Idempotente: correr dos veces no duplica team/membership/profile.
- No toca limpiezas, chats ni otras entidades.

## Validacion en Prisma Studio
Para cada cleaner:
- `User.tenantId` apunta a un tenant Services propio.
- `Team` existe con nombre "Mi equipo".
- `TeamMembership` ACTIVE con role CLEANER.
- `CleanerProfile` existe.

Checklist demo migration:
- `User.tenantId` cambia de demo a services.
- Teams/memberships en demo no se modifican.

## Observabilidad
- Al inicio y al final se imprime `runId` (y `reportPath` si aplica).
- Si aplica demo migration, el output incluye:
  - `migratedFromDemo: true`
  - `previousTenantId` y `newTenantId`
- Si `--report-json` esta presente, se escribe un JSON con resultados por usuario (sin duplicados).

## SQL runner
`prisma db execute` no imprime resultados en consola. Para ver salidas:
```
node scripts/runSqlReport.mjs --file scripts/verify_backfill_services_tenants.sql
node scripts/runSqlReport.mjs --file scripts/debug_cleaner_assignments.sql
```
Alternativa:
```
psql "$DATABASE_URL" -f scripts/verify_backfill_services_tenants.sql
```

## Verificacion post-apply
- Cuando hay usuarios aplicados, el script valida:
  - `user.tenantId` == `newTenantId`
  - existe team base "Mi equipo"
  - existe membership TL
- Si falla, el script termina con exit code != 0.

## Post-apply verification (manual)
1) Ejecuta:
```
npx prisma db execute --file scripts/verify_backfill_services_tenants.sql
```

2) Resultado esperado:
- cleaner1 tenant slug: `services-itzel`
- cleaner4 tenant slug: `services-kath`
- Ambos: team "Mi equipo" existe y membership ACTIVE existe para ese team
- cleaner2/3 siguen en tenant slug `ranferi-airbnb`

## Host home migration
Cambiar el home tenant de cleaners que hoy apuntan a un tenant HOST:
```
node scripts/backfillSeedServiceTenants.mjs --mode=apply --yes --allow-host-home-migration --emails cleaner2@hausdame.test,cleaner3@hausdame.test
```

Nota:
- Solo cambia `User.tenantId` (home tenant).
- Las memberships del tenant host (ej. team "Licha") quedan intactas.

## Revertir (seguro)
Usar PITR o branch en Neon. No se recomienda borrar manualmente registros.

## Resumen post
El script imprime:
- userId, email
- homeTenantId + slug
- baseTeamId
- tlMembershipId

