# REPO_HYGIENE.md
Guía oficial de higiene y mantenimiento del repositorio Hausdame

## 1. Propósito
Este documento define las reglas canónicas para mantener el repositorio
limpio, seguro y sostenible en el tiempo.

Su objetivo es:
- Evitar pérdida accidental de archivos críticos (ej. Prisma)
- Prevenir versionado de datos sensibles o basura local
- Reducir ruido en PRs y facilitar revisiones
- Establecer criterios claros sobre qué se versiona y qué no

Este documento es **normativo**.

---

## 2. Principios (MUST)

- El repositorio **debe poder clonarse y correr** sin archivos locales.
- Todo lo necesario para **build, migrate y deploy** debe estar versionado.
- Ningún archivo con **datos reales o sensibles** debe entrar al repo.
- Los cambios estructurales grandes deben hacerse en ramas dedicadas.
- Antes de migraciones, el repo debe estar en estado higiénico.

---

## 3. Qué SÍ se versiona

### 3.1 Código fuente
- `app/`
- `lib/`
- `components/`
- `middleware.ts`
- `types/`

### 3.2 Prisma (completo y obligatorio)
- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma/manual/`
- `prisma/scripts/`
- `prisma.config.ts`

> Regla de oro: **Prisma nunca vive solo en local.**

### 3.3 Documentación viva
- `docs/contracts/`
- `docs/templates/`
- `docs/analysis/`
- `docs/ARCHITECTURE_*.md`
- `docs/DB_MIGRATIONS.md`
- `docs/REPO_HYGIENE.md`

### 3.4 Scripts operativos
- `scripts/seed-*`
- `scripts/backfill-*`
- `scripts/qa/`
- `scripts/reset/`

---

## 4. Qué NO se versiona (MUST NOT)

### 4.1 Backups y dumps
- `*.dump`
- `backup_*.sql`
- `backup_*.schema.sql`

### 4.2 Exports con datos
- `dev-export.json`
- `apply-*.json`
- `dry-run*.json`
- `preflight.json`
- `tmp/exports/`

### 4.3 SQL temporales / debug
- `check_*.sql`
- `tmp_*.sql`
- `query_*.sql`
- `find_*.sql`
- `inspect_*.sql`
- `list_*.sql`

### 4.4 Temporales y output
- `tmp/`
- `scripts/tmp/`
- `lint-output.txt`

### 4.5 Configuración local
- `.env*`
- `.vscode/` (salvo acuerdo explícito del equipo)

---

## 5. Documentos históricos

- Notas, diagnósticos y resúmenes antiguos **NO van en la raíz**.
- Todo documento histórico debe moverse a:
docs/legacy/

Ejemplos:
- `DIAGNOSTICO_*.md`
- `ETAPA*.md`
- `*_RESUMEN.md`
- `FIX_*.md`

---

## 6. Checklist antes de una migración

Antes de cualquier migración Prisma:

- [ ] `git status` limpio
- [ ] `prisma/schema.prisma` presente y versionado
- [ ] `prisma/migrations/` completo
- [ ] `.env` correcto (DATABASE_URL / SHADOW_DATABASE_URL)
- [ ] No hay backups ni exports sin ignorar
- [ ] Rama dedicada (`chore/migration-*`)

---

## 7. Incidentes conocidos

- Feb 2026: eliminación local accidental de `prisma/` antes de un stash.
- Causa: higiene insuficiente del repo.
- Acción correctiva: este documento + `.gitignore` reforzado.

---

## 8. Regla final

> Si dudas si un archivo debe versionarse:
> - ¿Es necesario para otro desarrollador?
> - ¿Es necesario para CI / deploy?
> - ¿Contiene datos reales?

Si alguna respuesta es **no**, **no va al repo**.

---

**Este documento es ley del sistema.**
Cambios requieren PR y revisión explícita.
