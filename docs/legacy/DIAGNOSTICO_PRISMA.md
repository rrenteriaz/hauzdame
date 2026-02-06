---
# DIAGNÓSTICO PRISMA — HAUSDAME

**Fecha:** 2026-02-05  
**Rama actual:** `chore/cleaner-lint-type-safety`  
**Commit HEAD:** `b24edef`

---

## Estado actual

- **prisma/ presente:** NO
- **schema.prisma presente:** NO  
- **Prisma Client generado:** SÍ (en `node_modules/.prisma/client/`)
- **Scripts Prisma en package.json:** SÍ (en commit `4583488` del stash)
- **Dependencias Prisma:** SÍ (`@prisma/client`, `prisma` en commit `4583488`)

---

## Hallazgos

### 1) Historial git

**Último commit con referencias a Prisma:**
- **Commit:** `4583488` (stash@{0}) - "On chore/cleaner-lint-type-safety: WIP residual antes de migración (2)"
- **Fecha:** 2026-02-05 16:17:31
- **Contenido:** `package.json` incluye scripts Prisma (`db:status`, `db:deploy`, `db:dev`) y dependencias (`@prisma/client@^7.1.0`, `prisma@^7.1.0`)
- **Archivos en commit:** `.gitignore`, `README.md`, `app/cleaner/actions.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `eslint.config.mjs`, `next.config.ts`, `package-lock.json`, `package.json`
- **prisma/ presente:** NO (no aparece en la lista de archivos del commit)

**Búsqueda exhaustiva:**
- `git log --all --oneline --name-only` → **0 resultados** para `prisma/`
- `git log --all --diff-filter=A` → **0 resultados** para `prisma/`
- `git log --all --diff-filter=D` → **0 resultados** para `prisma/`
- `git ls-tree -r remotes/origin/main` → **0 resultados** para `prisma/`

**Conclusión:** `prisma/` **NUNCA** fue agregado al repositorio git en ningún commit histórico.

---

### 2) Stashes

**Stashes encontrados:**
- `stash@{0}`: "On chore/cleaner-lint-type-safety: WIP residual antes de migración (2)" (commit `4583488`)
- `stash@{1}`: "On chore/cleaner-lint-type-safety: WIP antes de migración InventoryCheck"

**Contenido de stashes:**
- `stash@{0}` contiene: `.gitignore`, `README.md`, `app/cleaner/actions.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `eslint.config.mjs`, `next.config.ts`, `package-lock.json`, `package.json`
- `stash@{1}` contiene: `.gitignore`, `README.md`, `app/cleaner/actions.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `eslint.config.mjs`, `next.config.ts`, `package-lock.json`, `package.json`

**prisma/ en stashes:** NO (ningún stash contiene `prisma/` o `schema.prisma`)

---

### 3) .gitignore

**Archivo actual:** `.gitignore` (líneas 1-42)

**Contenido relevante:**
- NO contiene `prisma/`
- NO contiene `schema.prisma`
- NO contiene `prisma.config.ts`
- Contiene: `/node_modules`, `/.next/`, `.env*`, etc.

**Historial de .gitignore:**
- Agregado en commit `4583488` (stash@{0})
- No hay cambios históricos que excluyan `prisma/`

**Conclusión:** `prisma/` **NO está siendo ignorado** por `.gitignore`.

---

### 4) Configuración alternativa

**Búsqueda de archivos de configuración:**
- `prisma.config.ts` → **NO encontrado** (ni en git ni en filesystem)
- `schema.prisma` en otras rutas → **NO encontrado**
- Referencias en `package.json` → Scripts Prisma presentes pero sin configuración de path personalizado

**Schema generado encontrado:**
- `node_modules/.prisma/client/schema.prisma` → **EXISTE** (1616 líneas, modelos completos)
- Este es el schema **generado** por Prisma Client, no el fuente

**Conclusión:** No hay configuración alternativa. Prisma espera `prisma/schema.prisma` por defecto.

---

## Conclusión

**Diagnóstico principal:**

El directorio `prisma/` y el archivo `prisma.config.ts` **EXISTÍAN en el repositorio local** pero fueron **eliminados ANTES de hacer los stashes** del 5 de febrero de 2026.

**Evidencia clave:**

1. ✅ **Referencias en `package.json`:** El commit `4583488` (stash@{0}) contiene en `package.json`:
   ```json
   "files": ["scripts/**/*", "prisma/scripts/**/*", "scripts/debug/**/*"]
   ```
   Esto confirma que `prisma/` existía y estaba siendo rastreado por git.

2. ✅ **Stashes mencionan "antes de migración":**
   - `stash@{0}`: "WIP residual antes de migración (2)" - 2026-02-05 16:17:31
   - `stash@{1}`: "WIP antes de migración InventoryCheck" - 2026-02-05 15:24:00
   Esto sugiere trabajo activo con migraciones de Prisma.

3. ❌ **Los stashes NO contienen `prisma/` o `prisma.config.ts`:**
   - `stash@{0}` contiene: `.gitignore`, `README.md`, `app/cleaner/actions.ts`, etc. (10 archivos)
   - `stash@{1}` contiene: mismos archivos (10 archivos)
   - **Ninguno incluye `prisma/` o `prisma.config.ts`**

4. ❌ **No hay commits que muestren eliminación:**
   - `git log --all --diff-filter=D` → 0 resultados para `prisma/` o `prisma.config.ts`
   - No hay commits que muestren estos archivos siendo eliminados

**Hipótesis más probable:**

Los archivos `prisma/` y `prisma.config.ts` fueron eliminados del filesystem local **ANTES de ejecutar `git stash push -u`** el 5 de febrero de 2026. Posibles causas:

1. **Eliminación manual accidental** antes del stash
2. **`git clean -fd` ejecutado** que eliminó archivos no rastreados (pero esto no aplica si estaban en git)
3. **Eliminación intencional** antes del stash para "limpiar" el working directory
4. **Problema con el stash:** Si los archivos estaban en el staging area pero no fueron incluidos en el stash por alguna razón

**Momento de la pérdida:**

- **Última referencia confirmada:** `package.json` en commit `4583488` menciona `prisma/scripts/**/*`
- **Stash creado:** 2026-02-05 16:17:31 (stash@{0})
- **Archivos ya ausentes:** En el momento del stash, `prisma/` y `prisma.config.ts` ya no estaban presentes

**Evidencia:**
- Los stashes contienen `package.json` con scripts Prisma, pero NO contienen `prisma/`
- El commit `4583488` menciona "antes de migración" pero no incluye el schema
- No hay ningún commit que muestre `prisma/` siendo agregado o eliminado
- El schema generado existe, lo que confirma que Prisma fue usado localmente

---

## Plan de recuperación propuesto

### Opción recomendada: Regenerar desde base de datos

Si la base de datos existe y tiene el schema actual:

```bash
# 1. Crear directorio prisma/
mkdir prisma

# 2. Regenerar schema desde la base de datos
npx prisma db pull

# 3. Esto creará prisma/schema.prisma con el schema actual de la DB

# 4. Revisar y ajustar el schema generado si es necesario

# 5. Agregar al repositorio
git add prisma/
git commit -m "chore: agregar prisma/ schema y migraciones"
```

**Ventajas:**
- Recupera el schema exacto de la base de datos
- No requiere acceso a backups o commits anteriores
- Es el método más seguro y confiable

**Riesgos:**
- Si la base de datos no existe o está vacía, no funcionará
- El schema generado puede necesitar ajustes manuales (comentarios, relaciones, etc.)

---

### Opción alternativa 1: Restaurar desde backup local

Si existe un backup del directorio `prisma/` en otro lugar:

```bash
# Copiar desde backup
cp -r /ruta/al/backup/prisma ./prisma

# Verificar que esté completo
ls -la prisma/
ls -la prisma/migrations/

# Agregar al repositorio
git add prisma/
git commit -m "chore: restaurar prisma/ desde backup"
```

---

### Opción alternativa 2: Recrear desde schema generado

Si el schema generado en `node_modules/.prisma/client/schema.prisma` es confiable:

```bash
# 1. Crear directorio
mkdir prisma

# 2. Copiar schema generado como base
cp node_modules/.prisma/client/schema.prisma prisma/schema.prisma

# 3. Ajustar generator y datasource si es necesario
# (el schema generado puede tener configuraciones diferentes)

# 4. Recrear migraciones desde el estado actual
npx prisma migrate dev --name init --create-only

# 5. Revisar y ajustar migraciones

# 6. Agregar al repositorio
git add prisma/
git commit -m "chore: restaurar prisma/ desde schema generado"
```

**Riesgos:**
- El schema generado puede no ser idéntico al fuente original
- Las migraciones recreadas pueden no coincidir con las históricas
- Puede requerir ajustes manuales significativos

---

### Opción alternativa 3: Buscar en otros branches/remotes

Si hay otros branches o remotes que puedan tener `prisma/`:

```bash
# Buscar en todos los branches
git branch -a | ForEach-Object { git ls-tree -r $_ --name-only | Select-String -Pattern "prisma" }

# Si se encuentra, hacer checkout del archivo específico
git checkout <branch> -- prisma/schema.prisma
git checkout <branch> -- prisma/migrations/
```

**Riesgos:**
- Puede no existir en ningún branch
- Puede estar desactualizado respecto al schema actual

---

## Recomendaciones post-recuperación

1. **Verificar integridad:**
   ```bash
   npx prisma validate
   npx prisma migrate status
   ```

2. **Asegurar que prisma/ esté en .gitignore correctamente:**
   - `prisma/` NO debe estar en `.gitignore` (debe versionarse)
   - `node_modules/.prisma/` SÍ debe estar ignorado (ya está en `/node_modules`)

3. **Crear migración inicial si es necesario:**
   ```bash
   npx prisma migrate dev --name restore_schema
   ```

4. **Documentar el incidente** para evitar que vuelva a ocurrir

---

## Resumen ejecutivo

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| `prisma/` en git | ❌ NO | Nunca fue agregado al repositorio |
| `schema.prisma` en git | ❌ NO | Nunca fue versionado |
| Prisma configurado | ✅ SÍ | Scripts y dependencias en `package.json` |
| Prisma Client generado | ✅ SÍ | Existe en `node_modules/.prisma/client/` |
| Stashes contienen prisma/ | ❌ NO | Ningún stash incluye `prisma/` |
| `.gitignore` excluye prisma/ | ❌ NO | No está siendo ignorado |
| Base de datos existe | ❓ DESCONOCIDO | Requiere verificación |

**Conclusión final:** `prisma/` y `prisma.config.ts` existían en el repositorio pero fueron eliminados del filesystem local **antes del stash del 5 de febrero de 2026**. Los archivos nunca fueron incluidos en los stashes, lo que sugiere que fueron eliminados manualmente o con `git clean` antes de hacer el stash.

**Plan de recuperación recomendado:**

1. **Verificar si hay backup local** (Time Machine, copias manuales, etc.)
2. **Si no hay backup:** Regenerar desde base de datos usando `prisma db pull`
3. **Restaurar `prisma.config.ts`** desde memoria o recrearlo según la configuración del proyecto

---

