const DISPLAY_DATE_REGEX = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;

function padToTwo(value: number | string): string {
  return String(value).padStart(2, "0");
}

export function isDisplayDate(value: string): boolean {
  return DISPLAY_DATE_REGEX.test(value);
}

export function isoToDisplayDate(isoDate: string): string {
  if (!isoDate) {
    return "";
  }

  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) {
    return "";
  }

  return `${padToTwo(month)}/${padToTwo(day)}/${year}`;
}

export function displayDateToIso(displayDate: string): string {
  if (!isDisplayDate(displayDate)) {
    return "";
  }

  const [month, day, year] = displayDate.split("/");
  return `${year}-${padToTwo(month)}-${padToTwo(day)}`;
}

export function todayDisplayDate(): string {
  const now = new Date();
  const month = padToTwo(now.getMonth() + 1);
  const day = padToTwo(now.getDate());
  const year = now.getFullYear();
  return `${month}/${day}/${year}`;
}

export function compareDisplayDatesDesc(left: string, right: string): number {
  return displayDateToIso(right).localeCompare(displayDateToIso(left));
}

