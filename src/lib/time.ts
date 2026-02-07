export type Meridiem = "AM" | "PM";

export interface TimeParts {
  hour: string;
  minute: string;
  meridiem: Meridiem;
}

function normalizeRawTime(value: string): string {
  return value.trim().replace(/\./g, "").replace(/\s+/g, " ").toUpperCase();
}

function to12Hour(hour24: number): { hour12: number; meridiem: Meridiem } {
  if (hour24 === 0) {
    return { hour12: 12, meridiem: "AM" };
  }
  if (hour24 < 12) {
    return { hour12: hour24, meridiem: "AM" };
  }
  if (hour24 === 12) {
    return { hour12: 12, meridiem: "PM" };
  }
  return { hour12: hour24 - 12, meridiem: "PM" };
}

export function parseTimeToMinutes(value: string): number | null {
  const normalized = normalizeRawTime(value);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d{1,2})(?::(\d{1,2}))?\s*([AP]M)?$/);
  if (!match) {
    return null;
  }

  const rawHour = Number.parseInt(match[1], 10);
  const minute = match[2] ? Number.parseInt(match[2], 10) : 0;
  const meridiem = match[3] ?? "";

  if (Number.isNaN(rawHour) || Number.isNaN(minute) || minute < 0 || minute > 59) {
    return null;
  }

  let hour24 = rawHour;
  if (meridiem) {
    if (rawHour < 1 || rawHour > 12) {
      return null;
    }
    if (meridiem === "AM") {
      hour24 = rawHour === 12 ? 0 : rawHour;
    } else {
      hour24 = rawHour === 12 ? 12 : rawHour + 12;
    }
  } else if (rawHour < 0 || rawHour > 23) {
    return null;
  }

  return hour24 * 60 + minute;
}

export function normalizeTimeDisplay(value: string): string | null {
  const minutes = parseTimeToMinutes(value);
  if (minutes === null) {
    return null;
  }

  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const { hour12, meridiem } = to12Hour(hour24);
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

export function formatTimeParts(parts: TimeParts): string | null {
  const hour = Number.parseInt(parts.hour, 10);
  const minute = Number.parseInt(parts.minute, 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return null;
  }
  if (parts.meridiem !== "AM" && parts.meridiem !== "PM") {
    return null;
  }
  return `${hour}:${String(minute).padStart(2, "0")} ${parts.meridiem}`;
}
