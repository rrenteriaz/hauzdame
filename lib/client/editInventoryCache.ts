/**
 * Cache en memoria para datos de edición de líneas de inventario.
 * Permite prefetch (hover/focus/touch) y apertura instantánea del modal.
 */

import { getInventoryLineForEditAction } from "@/app/host/inventory/actions";

export type EditData = Awaited<ReturnType<typeof getInventoryLineForEditAction>>;

const TTL_MS = 90_000; // 90 segundos
const CACHE = new Map<
  string,
  { data: NonNullable<EditData>; expiresAt: number }
>();
const IN_PROGRESS = new Map<string, Promise<EditData | null>>();

function cacheKey(propertyId: string, lineId: string): string {
  return `${propertyId}:${lineId}`;
}

function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

/**
 * Obtiene datos del cache si existen y no están expirados.
 */
export function get(
  propertyId: string,
  lineId: string
): NonNullable<EditData> | null {
  const key = cacheKey(propertyId, lineId);
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (isExpired(entry.expiresAt)) {
    CACHE.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Guarda datos en el cache.
 */
export function set(
  propertyId: string,
  lineId: string,
  data: NonNullable<EditData>
): void {
  const key = cacheKey(propertyId, lineId);
  CACHE.set(key, {
    data,
    expiresAt: Date.now() + TTL_MS,
  });
}

/**
 * Indica si hay datos válidos en cache.
 */
export function has(propertyId: string, lineId: string): boolean {
  return get(propertyId, lineId) !== null;
}

/**
 * Prefetch: carga datos si no están en cache ni en progreso.
 * Si ya hay fetch en curso, retorna esa misma promesa.
 */
export function prefetch(
  propertyId: string,
  lineId: string
): Promise<EditData | null> {
  const key = cacheKey(propertyId, lineId);

  if (has(propertyId, lineId)) {
    return Promise.resolve(get(propertyId, lineId));
  }

  const inProgress = IN_PROGRESS.get(key);
  if (inProgress) return inProgress;

  const promise = getInventoryLineForEditAction(lineId, propertyId);
  IN_PROGRESS.set(key, promise);

  return promise.then((data) => {
    IN_PROGRESS.delete(key);
    if (data?.line) {
      set(propertyId, lineId, data);
    }
    return data;
  });
}

/**
 * Invalida el cache para una línea (tras crear/eliminar variantes).
 */
export function invalidate(propertyId: string, lineId: string): void {
  const key = cacheKey(propertyId, lineId);
  CACHE.delete(key);
}

/**
 * Actualiza el cache con datos frescos (tras mutaciones en el modal).
 */
export function update(
  propertyId: string,
  lineId: string,
  data: NonNullable<EditData>
): void {
  set(propertyId, lineId, data);
}

export const editInventoryCache = {
  get,
  set,
  has,
  prefetch,
  invalidate,
  update,
};
