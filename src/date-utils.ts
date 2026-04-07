/**
 * Converts any date-like value to a YYYY-MM-DD string for the Habitica API.
 *
 * Raycast provides a real Date object from Form.DatePicker, but other
 * runtimes (e.g. Vicinae on Linux) may pass a string or number instead.
 * This helper normalises all cases so the rest of the codebase never
 * needs to call .toISOString() directly.
 *
 * Returns undefined when the value is absent or not parseable.
 */
export function toHabiticaDate(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;

  const date =
    value instanceof Date
      ? value
      : typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : null;

  if (!date || Number.isNaN(date.getTime())) return undefined;

  return date.toISOString().split("T")[0];
}
