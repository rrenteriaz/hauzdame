export function devTrace(label: string, data?: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  if (process.env.DEBUG_RENDERS !== "1") return;
  console.log(`[debug-render] ${label}`, data ?? "");
}

