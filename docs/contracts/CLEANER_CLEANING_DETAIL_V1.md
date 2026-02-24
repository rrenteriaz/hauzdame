# Detalle de Limpieza (Cleaner) — Contrato UX v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Definición inicial del comportamiento UX del detalle de limpieza para Cleaner  
**Alcance:** Cleaner/TL (Services tenant) — Comportamiento UX y mensajes del detalle de limpieza

**Referencias:**
- `CLEANING_DETAIL_UX_V1.md`: Contrato equivalente para Host
- `CLEANER_DASHBOARD_HOY_CONTRACT.md`: Navegación desde dashboard Cleaner

---

## 1. Propósito del Detalle de Limpieza (Cleaner)

### 1.1 Para qué existe esta página

**Propósito principal:**
- Mostrar información completa de una limpieza específica asignada o disponible
- Permitir al Cleaner aceptar, iniciar, completar o declinar limpiezas
- Proporcionar contexto visual (checklist, inventario, ubicación) para ejecutar la limpieza
- Facilitar la comunicación con el Host (notas, razones de no completado)

**Decisiones que permite tomar:**
- Aceptar una limpieza disponible
- Iniciar una limpieza aceptada
- Completar una limpieza en progreso
- Declinar una limpieza (si aplica)
- Marcar tareas del checklist como completadas
- Indicar razones si una tarea no se completó

**Qué NO es su responsabilidad:**
- ❌ NO permite configurar checklist de la propiedad (eso lo hace el Host)
- ❌ NO permite gestionar imágenes del checklist (solo visualización)
- ❌ NO permite modificar inventario (solo referencia)

**Principio rector:** Esta página muestra **información y permite ejecución**, no configuración.

---

## 2. Visualización de imágenes de referencia en tareas

### 2.1 Miniaturas de imágenes

**MUST:**
- El Cleaner puede visualizar miniaturas de imágenes asociadas a tareas del checklist.
- Las miniaturas:
  - Ayudan a comprender cómo debe ejecutarse la tarea.
  - Se muestran antes de la viñeta (•) para mantener alineación consistente.
  - Tamaño discreto: 32px × 32px.
  - Abren un modal de preview de solo lectura al hacer tap/click.
- El Cleaner NO puede:
  - Agregar imágenes.
  - Eliminar imágenes.
  - Editar imágenes.
- La visualización está disponible:
  - Antes de aceptar la limpieza (modo preview).
  - Después de aceptar la limpieza (modo operativo).
- Si una tarea no tiene imágenes:
  - No se muestra miniatura.
  - El slot de 32px permanece vacío pero ocupa espacio para mantener alineación de viñetas.
- El preview modal:
  - Muestra la imagen en grande (solo visualización).
  - Se cierra con botón X, click fuera o tecla Escape.
  - NO permite agregar, editar ni eliminar imágenes.

**MUST NOT:**
- Permitir gestión de imágenes desde el preview modal.
- Mostrar miniatura si no hay imágenes.
- Prometer automatismos o validaciones adicionales basadas en imágenes.

**NOTA (no contractual):**
- Las miniaturas se obtienen haciendo match entre CleaningChecklistItem (snapshot) y PropertyChecklistItem usando (area, title, sortOrder).
- Las miniaturas reutilizan los thumbnails obtenidos vía batch SSR para optimizar performance.
- El preview modal usa el mismo thumbnail (no carga imagen original) para mantener consistencia.
- La presencia de imágenes no implica obligación adicional ni cambio en el alcance del servicio.

---

## 3. Checklist de implementación

### 3.1 Verificaciones de imágenes

- [ ] Las miniaturas se muestran correctamente antes de la viñeta
- [ ] Las viñetas permanecen alineadas verticalmente independientemente de la presencia de miniaturas
- [ ] El preview modal se abre al hacer click/tap en la miniatura
- [ ] El preview modal se cierra con botón X, click fuera o Escape
- [ ] No hay opciones de edición en el preview modal
- [ ] Las miniaturas están disponibles antes y después de aceptar la limpieza
- [ ] El slot de 32px se mantiene vacío cuando no hay imágenes (alineación consistente)

---

