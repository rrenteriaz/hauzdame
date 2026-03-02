# Análisis: Branches de Neon — Qué se puede borrar sin riesgo

**Proyecto:** Hausdame  
**Fecha:** 2026-02-10  
**Objetivo:** Determinar qué branches de Neon se pueden borrar sin riesgo.

---

## 1. Consumidores de URLs de base de datos en el repo

### DATABASE_URL

| Consumidor | Archivo / Origen | Uso |
|------------|------------------|-----|
| **App runtime** | `lib/prisma.ts` | Conexión principal Prisma → usa lo que esté en `.env` |
| **Prisma migraciones** | `prisma.config.ts` | Usa `MIGRATE_DATABASE_URL` si existe, si no `DATABASE_URL` (conversión pooler→directa) |
| **Scripts** | `scripts/seed-dev-users.ts`, `export-dev-data.ts`, `set-password.ts`, `runSqlReport.mjs`, `db-sanity-check.mjs`, `backfillSeedServiceTenants.mjs`, `check-and-fix-user.ts`, `migrate-schedules.ts` | Todos usan `process.env.DATABASE_URL` |
| **Scripts debug** | `scripts/debug/*.ts` | Usan `DATABASE_URL` |
| **Prisma scripts** | `prisma/scripts/phase1_*.js`, `phase2_*.js` | Usan `DATABASE_URL` |
| **Vercel/CI** | No hay `.github` ni `vercel.json` con URLs hardcodeadas | Usa env vars de la plataforma |
| **Docs** | Múltiples `.md` | Referencias genéricas, no endpoints concretos |

**Fuente real:** `.env` (o `.env.local`) → define el endpoint que usa toda la app y scripts.

### SHADOW_DATABASE_URL

| Consumidor | Archivo | Uso |
|------------|---------|-----|
| **Prisma** | `prisma.config.ts` (líneas 57–66) | Solo si está definida; se pasa como `shadowDatabaseUrl` para `migrate dev` |

**Fuente real:** `.env` → solo usada por `prisma migrate dev` cuando existe.

---

## 2. Referencias a endpoints en el repo

| Endpoint | Contexto en repo |
|----------|------------------|
| `ep-green-base-a4mtrkyj` | `docs/debug/DELETE_DEMO_TENANT_AND_USER_REPORT.md`, `docs/legacy/AUDITORIA_LIMPIEZA_REPO.md` (backups). Corresponde a **br-little-rice-a4pd3rha** según contexto del usuario. |
| `ep-hidden-salad-a41k2cks` | Solo en `.env` como `SHADOW_DATABASE_URL` (el usuario lo indicó). **No hay referencias en código.** |
| `ep-billowing-queen-a4kq6dfg` | `docs/legacy/DIAGNOSTICO_CONEXION_NEON.md`, `AUDIT_DB_REPORT*.md` — **histórico/legacy** |

### Nombres de branches (referencias en docs)

| Branch | Archivo | Contexto |
|--------|---------|----------|
| `dev-shadow` | `docs/legacy/ETAPA4_5_2_SHADOW_DB_FIX.md`, `docs/MIGRATION_BASELINE.md`, `docs/NEON_SHADOW_DB_SETUP.md` | Nombre sugerido para shadow branch |
| `prisma-shadow` | Ninguno | No hay referencias en el repo |
| `production`, `development` | Ninguno | No hay referencias en el repo |

---

## 3. Validaciones en Neon (a ejecutar manualmente)

Para cada branch, anotar en Neon Console:

- **parent** (branch padre)
- **endpoint hostname** (ep-xxxx.neon.tech)
- **tamaño / storage**
- **last active** (última actividad)

### Identificar branch de SHADOW_DATABASE_URL

El usuario indicó que `SHADOW_DATABASE_URL` apunta a `ep-hidden-salad-a41k2cks` y que **no** coincide con el branch `prisma-shadow`.

Paso necesario en Neon:

1. Ir a **Branches** → revisar cada branch y su **Connection string** / host.
2. Verificar si algún branch listado usa `ep-hidden-salad-a41k2cks`.
3. Si no aparece:
   - puede ser un branch borrado (endpoint huérfano),
   - un branch de otro proyecto,
   - o un branch no visible en la lista actual.

---

## 4. Tabla de recomendaciones

| Branch | Endpoint (según contexto) | Uso detectado | Recomendación | Evidencia / motivo |
|--------|---------------------------|--------------|---------------|--------------------|
| **production** | (root) | Posible producción / deploys | **KEEP** | Branch raíz; borrarlo sería crítico |
| **development** | (hija de production) | Intermedio para dev | **KEEP** | Rama principal de desarrollo |
| **br-little-rice-a4pd3rha** | ep-green-base-a4mtrkyj | App local, scripts, migraciones | **KEEP** | `DATABASE_URL` en `.env` apunta aquí |
| **prisma-shadow** | (no ep-hidden-salad) | Posible shadow viejo | **SAFE_DELETE** (tras validar) | No referenciado en repo; `SHADOW_DATABASE_URL` apunta a otro endpoint |
| **dev-shadow-20260124** | Por validar | Posible shadow antiguo | **INVESTIGATE** | Nombre sugiere shadow; confirmar si es el de ep-hidden-salad |
| **(ep-hidden-salad)** | ep-hidden-salad-a41k2cks | `SHADOW_DATABASE_URL` en `.env` | **KEEP** (si es un branch) | Usado por Prisma `migrate dev`; no borrar hasta cambiar/remover la var |

---

## 5. Inferencia sobre ep-hidden-salad

- `prisma-shadow` → el usuario indicó que **no** es este.
- `dev-shadow-20260124` → candidato: podría ser el branch de `SHADOW_DATABASE_URL`.

**Comprobación mínima en Neon:**  
En el detalle de cada branch, revisar el host de la Connection string y anotar cuál tiene `ep-hidden-salad-a41k2cks`.

---

## 6. Pasos manuales sugeridos antes de borrar

### Checklist antes de borrar cualquier branch

- [ ] Backup / point-in-time restore creado para el branch (si tiene datos importantes)
- [ ] Confirmado en Neon qué branch tiene `ep-hidden-salad-a41k2cks`
- [ ] Si se borra el branch de `SHADOW_DATABASE_URL`: actualizar `.env` (comentar o apuntar a otro branch)
- [ ] Probar `npx prisma migrate dev` después de cambios (con o sin shadow)
- [ ] No haber ejecutado migraciones pendientes contra el branch a borrar en las últimas horas

### Orden recomendado si se va a limpiar

1. **Identificar** en Neon el branch de `ep-hidden-salad`.
2. **Decidir** si se seguirá usando shadow:
   - Si sí: crear un branch nuevo tipo `dev-shadow` y actualizar `SHADOW_DATABASE_URL`.
   - Si no: comentar/eliminar `SHADOW_DATABASE_URL` en `.env`.
3. **Borrar** solo branches no referenciados y que no sean padres de otros en uso.

---

## 7. Comandos para verificación local (PowerShell)

```powershell
# Ver host de DATABASE_URL (sin mostrar credenciales)
node -e "try { const u = new URL(process.env.DATABASE_URL || ''); console.log('DATABASE_URL host:', u.hostname); } catch(e) { console.log('DATABASE_URL no definida o inválida'); }"

# Ver host de SHADOW_DATABASE_URL
node -e "try { const u = new URL(process.env.SHADOW_DATABASE_URL || ''); console.log('SHADOW_DATABASE_URL host:', u.hostname); } catch(e) { console.log('SHADOW_DATABASE_URL no definida'); }"
```

Ejecutar desde la raíz del repo (donde está `.env`):

```powershell
cd C:\Users\Ranferi\Hausdame
# Cargar .env (Next.js/dotenv lo haría automático; para script directo)
node -e "require('dotenv').config(); const u = new URL(process.env.DATABASE_URL || 'http://x'); console.log('DATABASE_URL host:', u.hostname);"
```

---

## 8. Resumen ejecutivo

| Acción | Branch(es) |
|--------|-------------|
| **NO borrar** | production, development, br-little-rice-a4pd3rha |
| **Borrar con validación** | prisma-shadow (si no es el de SHADOW_DATABASE_URL y no tiene datos necesarios) |
| **Investigar primero** | dev-shadow-20260124 — confirmar si es el de ep-hidden-salad |
| **Bloqueador** | Identificar en Neon qué branch usa ep-hidden-salad antes de borrar nada usado por shadow |

---

## 9. Riesgos a considerar

- **Prisma shadow:** Si se borra el branch usado por `SHADOW_DATABASE_URL`, `prisma migrate dev` fallará hasta actualizar o quitar la variable.
- **Deploys:** Si Vercel u otra plataforma usan env vars distintas, revisar en el dashboard que no apunten al branch a borrar.
- **Datos:** Evitar borrar branches con datos que se necesiten; preferir crear backups antes.
