/** Reads a capacity (whole story points, 0–100) from a request body; null if invalid */
export function parseCapacity(value: unknown) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 && n <= 100 ? n : null
}

/** YYYY-MM-DD, and a real date */
export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}
