/** Local `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">`. */
export function toDatetimeLocalValue(value?: string | Date | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function nowDatetimeLocal(): string {
  return toDatetimeLocalValue(new Date());
}

/** Convert datetime-local value to ISO for the API. */
export function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}
