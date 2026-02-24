/**
 * Modelo de defaultVariantOptions (JSON en InventoryItem).
 * Compatible con datos previos (null o formatos legacy).
 */

import { normalizeVariantValue } from "./inventory-normalize";

export interface DefaultVariantOption {
  value: string;
  valueNormalized: string;
}

export interface DefaultVariantOptionsJson {
  options: DefaultVariantOption[];
}

/**
 * Parsea defaultVariantOptions desde el JSON almacenado.
 * Compatible con: null, array de strings, { options: [...] }
 */
export function parseDefaultVariantOptions(
  raw: unknown
): DefaultVariantOptionsJson | null {
  if (raw == null) return null;

  if (typeof raw === "object" && raw !== null && "options" in raw) {
    const obj = raw as { options?: unknown[] };
    if (!Array.isArray(obj.options)) return null;
    const options: DefaultVariantOption[] = [];
    for (const opt of obj.options) {
      if (typeof opt === "string") {
        const n = normalizeVariantValue(opt);
        if (n) options.push({ value: opt.trim(), valueNormalized: n });
      } else if (typeof opt === "object" && opt !== null && "value" in opt) {
        const o = opt as { value?: string; valueNormalized?: string };
        const value = String(o.value ?? "").trim();
        const valueNormalized =
          typeof o.valueNormalized === "string"
            ? o.valueNormalized
            : normalizeVariantValue(value);
        if (valueNormalized) options.push({ value, valueNormalized });
      }
    }
    return options.length > 0 ? { options } : null;
  }

  if (Array.isArray(raw)) {
    const options: DefaultVariantOption[] = [];
    for (const item of raw) {
      if (typeof item === "string") {
        const n = normalizeVariantValue(item);
        if (n) options.push({ value: item.trim(), valueNormalized: n });
      } else if (typeof item === "object" && item !== null && "value" in item) {
        const o = item as { value?: string };
        const value = String(o.value ?? "").trim();
        const n = normalizeVariantValue(value);
        if (n) options.push({ value, valueNormalized: n });
      } else if (typeof item === "object" && item !== null && "label" in item) {
        const o = item as { label?: string };
        const value = String(o.label ?? "").trim();
        const n = normalizeVariantValue(value);
        if (n) options.push({ value, valueNormalized: n });
      }
    }
    return options.length > 0 ? { options } : null;
  }

  return null;
}

/**
 * Serializa opciones para guardar en JSON.
 */
export function serializeDefaultVariantOptions(
  options: Array<{ value: string }>
): DefaultVariantOptionsJson {
  const seen = new Set<string>();
  const result: DefaultVariantOption[] = [];
  for (const o of options) {
    const value = o.value.trim();
    const valueNormalized = normalizeVariantValue(value);
    if (!valueNormalized) continue;
    if (seen.has(valueNormalized)) continue;
    seen.add(valueNormalized);
    result.push({ value, valueNormalized });
  }
  return { options: result };
}

/**
 * Normaliza key para variantKey: slug simple (minúsculas, guiones bajos).
 */
export function normalizeVariantKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Grupo de variantes con key, label y opciones */
export interface VariantGroupData {
  key: string;
  label: string | null;
  options: DefaultVariantOption[];
}

/**
 * Parsea todos los grupos de variantes desde InventoryItem.
 * Soporta: legacy (defaultVariantKey + defaultVariantOptions) y nuevo formato (defaultVariantOptions.groups).
 */
export function parseDefaultVariantGroups(item: {
  defaultVariantKey?: string | null;
  defaultVariantLabel?: string | null;
  defaultVariantOptions?: unknown;
}): VariantGroupData[] {
  const raw = item.defaultVariantOptions;
  const legacyKey = item.defaultVariantKey?.trim() || null;
  const legacyLabel = item.defaultVariantLabel?.trim() || null;

  // Formato nuevo: { groups: [{ key, label, options: [...] }, ...] }
  if (raw != null && typeof raw === "object" && "groups" in raw) {
    const obj = raw as { groups?: unknown[] };
    if (!Array.isArray(obj.groups)) return [];
    const result: VariantGroupData[] = [];
    for (const g of obj.groups) {
      if (typeof g !== "object" || g == null || !("key" in g)) continue;
      const grp = g as { key?: string; label?: string; options?: unknown[] };
      const key = normalizeVariantKey(String(grp.key ?? "").trim());
      if (!key) continue;
      const parsed = parseDefaultVariantOptions(grp.options ?? grp);
      if (parsed && parsed.options.length >= 2) {
        result.push({
          key,
          label: grp.label?.trim() || null,
          options: parsed.options,
        });
      }
    }
    return result;
  }

  // Formato legacy: defaultVariantKey + defaultVariantOptions como { options }
  if (legacyKey) {
    const parsed = parseDefaultVariantOptions(raw);
    if (parsed && parsed.options.length >= 2) {
      return [{ key: legacyKey, label: legacyLabel, options: parsed.options }];
    }
  }
  return [];
}

/**
 * Serializa grupos para guardar en defaultVariantOptions.
 * Formato: { groups: [{ key, label, options: [...] }] }
 */
export function serializeDefaultVariantGroups(
  groups: Array<{ key: string; label?: string | null; options: Array<{ value: string }> }>
): { groups: Array<{ key: string; label: string | null; options: DefaultVariantOption[] }> } {
  const seen = new Set<string>();
  const result: Array<{ key: string; label: string | null; options: DefaultVariantOption[] }> = [];
  for (const g of groups) {
    const key = normalizeVariantKey(g.key);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const optionsJson = serializeDefaultVariantOptions(g.options);
    if (optionsJson.options.length >= 2) {
      result.push({
        key,
        label: g.label?.trim() || null,
        options: optionsJson.options,
      });
    }
  }
  return { groups: result };
}
