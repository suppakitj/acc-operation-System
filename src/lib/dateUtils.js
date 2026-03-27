/**
 * Parse a date string from the database (which is always UTC but may lack 'Z' suffix)
 * and return a proper Date object.
 */
export function parseUTCDate(dateStr) {
  if (!dateStr) return null;
  // If the string doesn't end with Z or +/- timezone offset, append Z to mark it as UTC
  const s = String(dateStr);
  if (!s.endsWith('Z') && !(/[+-]\d{2}:\d{2}$/.test(s))) {
    return new Date(s + 'Z');
  }
  return new Date(s);
}