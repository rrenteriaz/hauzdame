HAUSDAME — INVITES QA (Services vs Host-Property)

Requisitos:
- Servidor corriendo en `http://localhost:3000`
- `DATABASE_URL` configurada

## Pasos
1) Inicia el servidor:
   - `npm run dev`

2) Genera tokens QA (idempotente):
   - `npx tsx scripts/qa/create-qa-tokens.ts`

3) Ejecuta QA de invites (status + body):
   - `npx tsx scripts/qa/run-invite-qa.ts`

4) Verifica DB post-QA:
   - `npx tsx scripts/qa/verify-db-after-qa.ts`

## Expected output (resumen)
Servicios (TeamInvite):
- Host reclama TeamInvite → 403
- Cleaner reclama TeamInvite → 200
- Race (Cleaner A vs B) → uno 200, otro 409

Host-Property (PropertyInvite):
- Cleaner reclama PropertyInvite(CLEANER) → 200
- Host reclama PropertyInvite(MANAGER) → 200
- Reclamar 2 veces mismo usuario → 200 con message idempotente

DB:
- TeamInvite en CLAIMED con claimedByUserId correcto
- TeamMembership ACTIVE creada
- PropertyInvite en CLAIMED
- PropertyMemberAccess con userId NOT NULL, teamMembershipId NULL, status ACTIVE y accessRole correcto

## Troubleshooting
- Si falla el login: revisa `qa-tokens.json` y la contraseña mostrada.
- Si el server no corre en 3000, ajusta `BASE_URL` en `scripts/qa/run-invite-qa.ts`.
- Si falta `qa-tokens.json`, ejecuta `create-qa-tokens.ts` primero.

