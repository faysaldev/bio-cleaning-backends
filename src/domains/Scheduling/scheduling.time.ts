const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string) => {
  const existing = formatterCache.get(timeZone);
  if (existing) return existing;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
};

const partsFor = (date: Date, timeZone: string) => {
  const parts = getFormatter(timeZone).formatToParts(date);
  const mapped: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") mapped[part.type] = Number(part.value);
  }
  return mapped;
};

export const assertTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    throw new Error(`Invalid IANA timezone: ${timeZone}`);
  }
};

export const zonedDateTimeToUtc = (date: string, time: string, timeZone: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let candidate = new Date(wallClockAsUtc);

  for (let i = 0; i < 3; i += 1) {
    const parts = partsFor(candidate, timeZone);
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      0,
    );
    const offset = representedAsUtc - candidate.getTime();
    const corrected = new Date(wallClockAsUtc - offset);
    if (Math.abs(corrected.getTime() - candidate.getTime()) < 1000) return corrected;
    candidate = corrected;
  }

  return candidate;
};

export const formatDateInZone = (date: Date, timeZone: string) => {
  const parts = partsFor(date, timeZone);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
};

export const formatTimeInZone = (date: Date, timeZone: string) => {
  const parts = partsFor(date, timeZone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
};

export const minutesFromTime = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

export const timeFromMinutes = (value: number) => {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, value));
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
};

export const labelTime = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
};

export const addCalendarOccurrence = (
  date: string,
  frequency: "ONE_TIME" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY",
  index: number,
) => {
  if (index === 0 || frequency === "ONE_TIME") return date;
  const base = new Date(`${date}T12:00:00.000Z`);
  if (frequency === "WEEKLY") base.setUTCDate(base.getUTCDate() + 7 * index);
  if (frequency === "BI_WEEKLY") base.setUTCDate(base.getUTCDate() + 14 * index);
  if (frequency === "MONTHLY") {
    const originalDay = base.getUTCDate();
    const targetMonthIndex = base.getUTCMonth() + index;
    const targetYear = base.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0, 12)).getUTCDate();
    base.setUTCFullYear(targetYear, normalizedMonth, Math.min(originalDay, lastDay));
  }
  return base.toISOString().slice(0, 10);
};
