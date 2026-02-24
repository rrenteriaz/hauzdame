import { ALLOW_PAST_OPEN_CLEANINGS } from "@/lib/flags";

function startOfToday(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function getAvailabilityStartDate(now: Date = new Date()): Date {
  if (ALLOW_PAST_OPEN_CLEANINGS) {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return startOfToday(start);
  }
  return startOfToday(now);
}

export function getAvailabilityWindow(now: Date = new Date()) {
  const start = getAvailabilityStartDate(now);
  const end = new Date(now);
  end.setDate(end.getDate() + 90);
  return { start, end: endOfDay(end) };
}

