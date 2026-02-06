---
# AUDITORÍA Y PROPUESTA DE LIMPIEZA — REPOSITORIO HAUSDAME

**Fecha:** 2026-02-05  
**Rama actual:** `restore-pre-stash`  
**Estado:** 10 archivos modificados, ~500+ archivos untracked

---

## RESUMEN EJECUTIVO

El repositorio contiene **~500+ archivos untracked** incluyendo:
- ✅ **Código fuente completo** (app/, lib/, components/, scripts/) — DEBE versionarse
- ✅ **Prisma completo** (schema.prisma, migrations/, prisma.config.ts) — DEBE versionarse
- ⚠️ **50+ documentos MD en raíz** — OPCIONAL (mover a docs/)
- 🚨 **Backups de base de datos** (.dump, .sql) — PELIGROSO versionar
- 🚨 **Exports con datos** (dev-export.json, tmp/exports/*.jsonl) — PELIGROSO versionar
- 🚨 **Archivos SQL temporales** (check_*.sql, tmp_*.sql) — NO versionar
- ⚠️ **Scripts de debug** (scripts/debug/, scripts/tmp/) — OPCIONAL (revisar manualmente)
- ⚠️ **Configuración IDE** (.vscode/) — OPCIONAL (decidir por equipo)

**Acción recomendada:** Agregar patrones a `.gitignore` para backups/exports/tmp, mover docs MD a `docs/`, y revisar scripts/debug antes de versionar.

---

## CLASIFICACIÓN DE ARCHIVOS

### A) DEBE VERSIONARSE (Código fuente, contratos, docs clave)

#### Código fuente (app/, lib/, components/, middleware.ts)
- ✅ `app/` — **TODO** (API routes, páginas, componentes)
- ✅ `lib/` — **TODO** (utilidades, helpers, lógica de negocio)
- ✅ `components/` — **TODO** (componentes React reutilizables)
- ✅ `middleware.ts` — **SÍ**
- ✅ `types/` — **SÍ** (definiciones de tipos TypeScript)

#### Prisma (confirmado completo)
- ✅ `prisma/schema.prisma` — **SÍ** (schema fuente)
- ✅ `prisma/migrations/` — **SÍ** (todas las migraciones)
- ✅ `prisma/manual/` — **SÍ** (scripts SQL manuales documentados)
- ✅ `prisma/scripts/` — **SÍ** (scripts de migración)
- ✅ `prisma.config.ts` — **SÍ** (configuración Prisma)

#### Documentación contractual y técnica
- ✅ `docs/contracts/` — **SÍ** (27 contratos canónicos)
- ✅ `docs/templates/` — **SÍ** (plantillas versionadas v1.0)
- ✅ `docs/analysis/` — **SÍ** (análisis técnicos)
- ✅ `docs/DB_MIGRATIONS.md` — **SÍ**
- ✅ `docs/QUICK_START.md` — **SÍ**
- ✅ `docs/PR_CHECKLIST.md` — **SÍ**
- ✅ `docs/NEON_SHADOW_DB_SETUP.md` — **SÍ**
- ✅ `docs/ARCHITECTURE_MEMBERSHIP.md` — **SÍ**

#### Scripts operativos
- ✅ `scripts/seed-dev-users.ts` — **SÍ**
- ✅ `scripts/create-missing-cleanings.ts` — **SÍ**
- ✅ `scripts/set-password.ts` — **SÍ**
- ✅ `scripts/backfill-*.ts` — **SÍ** (scripts de backfill documentados)
- ✅ `scripts/qa/` — **SÍ** (scripts de QA)
- ✅ `scripts/reset/` — **SÍ** (scripts de reset documentados)

#### Configuración del proyecto
- ✅ `package.json`, `package-lock.json` — **SÍ**
- ✅ `tsconfig.json`, `next.config.ts`, `eslint.config.mjs` — **SÍ**
- ✅ `README.md` — **SÍ**

---

### B) OPCIONAL VERSIONAR (Docs personales, notas, análisis históricos)

#### Documentos MD en raíz (mover a `docs/` o `docs/legacy/`)
- ⚠️ `*_RESUMEN.md` — Mover a `docs/legacy/` o `docs/informes/`
- ⚠️ `DIAGNOSTICO_*.md` — Mover a `docs/debug/` o `docs/legacy/`
- ⚠️ `ETAPA*.md` — Mover a `docs/legacy/`
- ⚠️ `FIX_*.md` — Mover a `docs/debug/` o `docs/legacy/`
- ⚠️ `MIGRATION_*.md` — Mover a `docs/legacy/`
- ⚠️ `*_IMPLEMENTACION.md` — Mover a `docs/legacy/` o `docs/informes/`
- ⚠️ `PERFORMANCE_DIAGNOSTIC.md` — Mover a `docs/debug/`
- ⚠️ `FINAL_SUMMARY.md` — Mover a `docs/legacy/`
- ⚠️ `SETUP_CHECKLIST.md` — Mover a `docs/` o mantener en raíz si es referencia rápida
- ⚠️ `COMMANDS.md` — Mover a `docs/` o mantener si es referencia rápida

**Recomendación:** Crear `docs/legacy/` y mover todos los documentos históricos allí. Mantener solo `README.md` y `SETUP_CHECKLIST.md` en raíz si son referencia rápida.

#### Documentos en `docs/borrador/`
- ⚠️ `docs/borrador/` — **OPCIONAL** (trabajo en progreso, puede mantenerse local)
- Si se versiona, mantener como está (ya está organizado)

#### Scripts de debug
- ⚠️ `scripts/debug/` — **OPCIONAL** (revisar manualmente antes de versionar)
  - Algunos pueden contener queries con datos específicos
  - Revisar si tienen hardcoded tenant IDs o datos sensibles
- ⚠️ `scripts/tmp_*.sql` — **NO versionar** (mover a tmp/ o eliminar)

#### Configuración IDE
- ⚠️ `.vscode/settings.json` — **OPCIONAL** (decidir por equipo)
  - Si contiene configuraciones específicas del proyecto (formatters, linters), versionar
  - Si contiene preferencias personales, NO versionar

---

### C) NO DEBE VERSIONARSE → Agregar a `.gitignore`

#### Backups de base de datos
- 🚫 `*.dump` — **NO versionar** (backups binarios de PostgreSQL)
- 🚫 `backup_*.sql` — **NO versionar** (backups SQL con datos)
- 🚫 `backup_*.schema.sql` — **NO versionar** (backups de schema)

#### Exports con datos
- 🚫 `dev-export.json` — **NO versionar** (export de datos de desarrollo)
- 🚫 `apply-*.json` — **NO versionar** (archivos de aplicación de datos)
- 🚫 `dry-run*.json` — **NO versionar** (archivos de prueba con datos)
- 🚫 `preflight.json` — **NO versionar** (si contiene datos)
- 🚫 `tmp/exports/*.jsonl` — **NO versionar** (exports temporales con datos)

#### Archivos SQL temporales/debug
- 🚫 `check_*.sql` — **NO versionar** (queries temporales)
- 🚫 `tmp_*.sql` — **NO versionar** (archivos temporales)
- 🚫 `query_*.sql` — **NO versionar** (queries temporales)
- 🚫 `find_*.sql` — **NO versionar** (queries temporales)
- 🚫 `inspect_*.sql` — **NO versionar** (queries temporales)
- 🚫 `list_*.sql` — **NO versionar** (queries temporales)

#### Directorios temporales
- 🚫 `tmp/` — **NO versionar** (directorio temporal completo)
- 🚫 `scripts/tmp/` — **NO versionar** (si existe)

#### Logs y outputs
- 🚫 `lint-output.txt` — **NO versionar** (output de linting)

#### Archivos generados
- 🚫 `*.tsbuildinfo` — **YA en .gitignore** ✅
- 🚫 `next-env.d.ts` — **YA en .gitignore** ✅

---

### D) PELIGROSO VERSIONAR (Backups, dumps, exports con datos reales)

#### ⚠️ CRÍTICO — NO VERSIONAR NUNCA
- 🚨 `backup_ep-green-base.dump` — **Contiene datos de producción/desarrollo**
- 🚨 `backup_ep-green-base.sql` — **Contiene datos de producción/desarrollo**
- 🚨 `backup_ep-green-base.schema.sql` — **Contiene schema con datos**
- 🚨 `dev-export.json` — **Contiene datos de desarrollo (usuarios, propiedades, etc.)**
- 🚨 `apply-demo-cleaners.json` — **Contiene datos de aplicación**
- 🚨 `apply-host-migration.json` — **Contiene datos de migración**
- 🚨 `dry-run*.json` — **Contiene datos de prueba**
- 🚨 `tmp/exports/*.jsonl` — **Contiene exports de cleanings/reservations con datos**

**Riesgo:** Estos archivos pueden contener:
- Credenciales (aunque hasheadas)
- Datos personales de usuarios
- Información de propiedades
- IDs de producción

**Acción:** Eliminar del repositorio inmediatamente después de agregar a `.gitignore`.

---

## PROPUESTA DE `.gitignore` (NO APLICADA)

Agregar las siguientes líneas a `.gitignore`:

```gitignore
# Backups de base de datos
*.dump
backup_*.sql
backup_*.schema.sql

# Exports con datos
dev-export.json
apply-*.json
dry-run*.json
preflight.json
tmp/exports/

# Archivos SQL temporales/debug
check_*.sql
tmp_*.sql
query_*.sql
find_*.sql
inspect_*.sql
list_*.sql

# Directorios temporales
tmp/
scripts/tmp/

# Logs y outputs
lint-output.txt

# Configuración IDE (opcional - decidir por equipo)
# .vscode/
```

**Nota:** `.vscode/` está marcado como opcional. Si el equipo quiere compartir configuraciones de VS Code, mantenerlo fuera de `.gitignore`. Si son preferencias personales, agregarlo.

---

## REORGANIZACIÓN DE DOCUMENTOS

### Propuesta: Mover documentos MD de raíz a `docs/legacy/`

**Crear estructura:**
```
docs/
  ├── legacy/          # Documentos históricos (nuevo)
  │   ├── resumenes/   # *_RESUMEN.md
  │   ├── diagnosticos/ # DIAGNOSTICO_*.md
  │   ├── etapas/      # ETAPA*.md
  │   ├── migrations/  # MIGRATION_*.md
  │   └── implementaciones/ # *_IMPLEMENTACION.md
  ├── contracts/       # (ya existe)
  ├── templates/       # (ya existe)
  ├── analysis/        # (ya existe)
  └── debug/           # (ya existe)
```

**Archivos a mover:**

**A `docs/legacy/resumenes/`:**
- `AJUSTE_INVITACIONES_WORKGROUPS_PARIDAD.md`
- `ANALISIS_IMPACTO_HOST_TEAMS_TO_WORKGROUPS.md`
- `FLUJO_WORKGROUPS_CLEANERS_RESUMEN.md`
- `MIGRACION_HOST_TEAMS_TO_WORKGROUPS_RESUMEN.md`
- `MIGRACION_PROPERTY_DETAIL_WORKGROUPS_RESUMEN.md`
- `REFACTOR_INVITACIONES_WORKGROUPS_RESUMEN.md`
- `RESUMEN_DIAGNOSTICO.md`
- `FINAL_SUMMARY.md`

**A `docs/legacy/diagnosticos/`:**
- `DIAGNOSTICO_CONEXION_NEON.md`
- `DIAGNOSTICO_HOST_TEAMS_TO_WORKGROUPS.md`
- `DIAGNOSTICO_P2022.md`
- `DIAGNOSTICO_PRISMA.md`
- `DEBUG_WGE_CLEANER_PROPERTIES.md`
- `PERFORMANCE_DIAGNOSTIC.md`

**A `docs/legacy/etapas/`:**
- `ETAPA3_MIGRATION_COMPLETA.md`
- `ETAPA3_REVISION.md`
- `ETAPA3_TESTS.md`
- `ETAPA4_1_AUDITORIA.md`
- `ETAPA4_4_3_RESUMEN.md`
- `ETAPA4_5_2_SHADOW_DB_FIX.md`
- `FASE3_VALIDACION_MANUAL.md`

**A `docs/legacy/migrations/`:**
- `MIGRATION_INSTRUCTIONS.md`
- `MIGRATION_MANUAL.md`
- `MIGRATION_PROPERTY_ID.md`

**A `docs/legacy/implementaciones/`:**
- `AUTH_IMPLEMENTACION_RESUMEN.md`
- `CHAT_IMAGES_IMPLEMENTACION.md`
- `MARKETPLACE_ETAPA1_RESUMEN.md`
- `MARKETPLACE_UI_IMPLEMENTACION.md`
- `MEDIA_INTEGRATION_NOTES.md`
- `OFFLINE_CHAT_IMPLEMENTACION.md`
- `REALTIME_CLIENT_IMPLEMENTACION.md`

**A `docs/debug/`:**
- `CHECKLIST_NO_RERENDER_FIX.md`
- `CHECKLIST_PERFORMANCE_FIX.md`
- `FIX_CHAT_HEADER_SCROLL.md`
- `FIX_CHAT_SENDING_BLOCKED.md`
- `FIX_NOTES.md`

**A `docs/informes/`:**
- `AUDIT_DB_REPORT.md`
- `AUDIT_DB_REPORT_FINAL.md`
- `BACKFILL_ASSIGNEES.md`

**Mantener en raíz (referencia rápida):**
- `README.md` — ✅
- `SETUP_CHECKLIST.md` — ⚠️ (opcional, puede ir a `docs/`)
- `COMMANDS.md` — ⚠️ (opcional, puede ir a `docs/`)
- `CLEANING_HOST_ATTENTION_CONTRACT.txt` — ⚠️ (mover a `docs/contracts/` o mantener)

---

## ARCHIVOS QUE REQUIEREN REVISIÓN MANUAL

### Scripts de debug (`scripts/debug/`)
Revisar manualmente antes de versionar para detectar:
- Hardcoded tenant IDs
- Queries con datos específicos
- Credenciales o información sensible

**Scripts sospechosos (revisar primero):**
- `scripts/debug/backfill-*-depa01.ts` — Contiene referencias a tenant específico
- `scripts/debug/cleanings-depa01.ts` — Contiene referencias a tenant específico
- `scripts/debug/diagnose-*-depa01.ts` — Contiene referencias a tenant específico
- `scripts/debug/fix-*-depa01.ts` — Contiene referencias a tenant específico
- `scripts/debug/property-*-depa01.ts` — Contiene referencias a tenant específico
- `scripts/debug/why-attention-depa01.ts` — Contiene referencias a tenant específico

**Recomendación:** Generalizar estos scripts removiendo referencias hardcoded a tenants específicos antes de versionar.

### Scripts SQL temporales en `scripts/`
- `scripts/tmp_diag_invite.sql` — Revisar si es temporal o documentado
- `scripts/tmp_enum_check.sql` — Revisar si es temporal o documentado
- `scripts/tmp_itzel_audit.sql` — Revisar si es temporal o documentado
- `scripts/debug_cleaner_assignments.sql` — Revisar si es documentado o temporal

**Recomendación:** Si son temporales, mover a `tmp/` o eliminar. Si son documentados, mantener en `scripts/` o mover a `prisma/manual/`.

---

## CONFIRMACIÓN: PRISMA COMPLETO Y COHERENTE

✅ **`prisma/schema.prisma`** — Presente y completo (1616 líneas)  
✅ **`prisma/migrations/`** — 48 migraciones presentes (47 SQL + 1 TOML)  
✅ **`prisma/manual/`** — 12 scripts SQL manuales documentados  
✅ **`prisma/scripts/`** — 5 scripts de migración (4 JS + 1 SQL)  
✅ **`prisma.config.ts`** — Presente en raíz  

**Estado:** Prisma está completo y listo para versionar. Todas las migraciones históricas están presentes.

---

## CHECKLIST DE ACCIONES RECOMENDADAS

### Fase 1: Protección inmediata (antes de cualquier commit)
- [ ] Agregar patrones a `.gitignore` (backups, exports, tmp)
- [ ] Verificar que `.gitignore` esté correcto
- [ ] **NO hacer commit todavía**

### Fase 2: Limpieza de archivos peligrosos
- [ ] Eliminar `backup_*.dump`, `backup_*.sql` del filesystem (ya están en `.gitignore`)
- [ ] Eliminar `dev-export.json`, `apply-*.json`, `dry-run*.json` del filesystem
- [ ] Eliminar `tmp/exports/*.jsonl` del filesystem
- [ ] Eliminar archivos SQL temporales (`check_*.sql`, `tmp_*.sql`, etc.)

### Fase 3: Reorganización de documentos
- [ ] Crear estructura `docs/legacy/` con subdirectorios
- [ ] Mover documentos MD de raíz a `docs/legacy/` según clasificación
- [ ] Mover documentos de fix a `docs/debug/`
- [ ] Mover informes a `docs/informes/`

### Fase 4: Revisión de scripts
- [ ] Revisar `scripts/debug/` para detectar datos sensibles
- [ ] Generalizar scripts con referencias hardcoded a tenants
- [ ] Decidir qué hacer con `scripts/tmp_*.sql` (eliminar o documentar)

### Fase 5: Configuración IDE
- [ ] Decidir si `.vscode/` debe versionarse (consulta con equipo)
- [ ] Si NO, agregar a `.gitignore`
- [ ] Si SÍ, asegurar que solo contenga configuraciones del proyecto

### Fase 6: Commit inicial
- [ ] `git add .gitignore`
- [ ] `git add prisma/` (confirmar que está completo)
- [ ] `git add app/ lib/ components/ middleware.ts types/`
- [ ] `git add scripts/` (excepto tmp/ si existe)
- [ ] `git add docs/` (incluyendo legacy/ después de reorganizar)
- [ ] `git add package.json package-lock.json tsconfig.json next.config.ts eslint.config.mjs`
- [ ] `git add README.md`
- [ ] `git commit -m "chore: limpieza y organización del repositorio"`

---

## RIESGOS Y ADVERTENCIAS

⚠️ **NO ejecutar `git add .` sin revisar primero** — Incluiría archivos peligrosos  
⚠️ **NO hacer commit de backups/exports** — Contienen datos sensibles  
⚠️ **NO eliminar archivos antes de agregar a `.gitignore`** — Podrían volver a aparecer  
⚠️ **Revisar scripts/debug manualmente** — Pueden contener datos específicos  

---

## RESUMEN FINAL

**Archivos a versionar:** ~400+ (código fuente, Prisma, docs clave)  
**Archivos a ignorar:** ~50+ (backups, exports, tmp, SQL temporales)  
**Archivos a reorganizar:** ~50+ (documentos MD de raíz)  
**Archivos peligrosos:** ~10+ (backups y exports con datos)  

**Estado del repositorio:** Listo para limpieza y organización. Prisma está completo y coherente.

---

