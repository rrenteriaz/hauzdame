# Checklist de Pull Request

Este documento contiene checklists reutilizables para validar PRs en Hausdame.

---

## Referencias obligatorias del repositorio

Antes de revisar o aprobar un PR, asegúrate de conocer y respetar:

- **Repo Hygiene:** `docs/REPO_HYGIENE.md`
  - Qué archivos se versionan
  - Qué debe ir a `.gitignore`
  - Reglas para backups, exports, temporales y documentación legacy

Estas reglas aplican a **todos los PRs**, independientemente del área funcional.

---

## WEB-only changes guardrails (layout)

**Referencia:** `docs/contracts/LAYOUT_BREAKPOINT_GUARDRAILS_V1.md`

### WEB-only classes
- [ ] Todas las clases de layout/containment tienen prefijo `lg:`
- [ ] No hay clases `mx-auto`, `max-w-*`, `px-*` sin prefijo `lg:`
- [ ] Los componentes visibles solo en desktop usan `hidden lg:block` o equivalente
- [ ] Los componentes visibles solo en mobile usan `lg:hidden` o equivalente

### Mobile regression (rutas clave)
- [ ] `/host/cleanings` — Sin header superior web, BottomNav visible, layout intacto
- [ ] `/host/cleanings/[id]` — Sin header superior web, layout intacto
- [ ] `/host/reservations/[id]` — Sin header superior web, layout intacto
- [ ] `/host/hoy` — Sin header superior web, BottomNav visible, layout intacto
- [ ] Verificar que no aparezcan barras de navegación superiores en mobile Host

### Desktop verification
- [ ] Contenido está centrado con max-width correcto (`max-w-6xl`)
- [ ] Padding lateral aplica correctamente (`px-6`)
- [ ] Header superior visible y funcional
- [ ] Layout consistente con otras páginas web

### Performance sanity
- [ ] No se introdujeron hooks/estado extra sin motivo
- [ ] No se agregaron re-renders innecesarios
- [ ] No se duplicaron wrappers innecesariamente
- [ ] Los componentes son server-safe (no client components innecesarios)

---

## Checklist general de PR

### Funcionalidad
- [ ] El código cumple con los requisitos del issue/tarea
- [ ] No hay regresiones en funcionalidad existente
- [ ] Los cambios están probados manualmente

### Código
- [ ] El código sigue las convenciones del proyecto
- [ ] No hay errores de TypeScript/linter
- [ ] Los comentarios son claros y útiles cuando es necesario
- [ ] No hay código comentado o dead code

### Testing
- [ ] Se probó en diferentes navegadores (si aplica)
- [ ] Se probó en mobile y desktop (si aplica)
- [ ] No hay errores en consola

### Documentación
- [ ] Se actualizaron contratos si es necesario
- [ ] Se agregaron comentarios cuando el código es complejo
- [ ] Se actualizó README si es necesario

---

**Nota:** Este checklist debe completarse antes de mergear cualquier PR.

