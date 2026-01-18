// Solo para QA/local. En producción debe estar apagado.
// Permite aceptar OPEN pasadas (ventana ~30 días hacia atrás).
// DEPLOY CHECK: asegurar ALLOW_PAST_OPEN_CLEANINGS=0 en producción.
export const ALLOW_PAST_OPEN_CLEANINGS =
  process.env.ALLOW_PAST_OPEN_CLEANINGS === "1" ||
  process.env.ALLOW_PAST_OPEN_CLEANINGS === "true" ||
  process.env.ALLOW_PAST_CLEANINGS_FOR_ACCEPTANCE === "1" ||
  process.env.ALLOW_PAST_CLEANINGS_FOR_ACCEPTANCE === "true";

