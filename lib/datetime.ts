// Helpers for <input type="datetime-local">, which works in the browser's
// local time with no timezone, e.g. "2026-12-01T09:30".

export function toDateTimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// new Date("2026-12-01T09:30") is parsed as local time, so this gives the
// UTC instant the user actually meant.
export function fromDateTimeLocalValue(value: string) {
  return new Date(value).toISOString();
}
