import { APP_CITY } from "@/lib/constants";

/** Clean user/API area strings — no trailing commas or duplicate city suffix. */
export function cleanAreaName(raw: string): string {
  return raw
    .trim()
    .replace(/,+\s*$/g, "")
    .replace(/\s*,\s*Lahore(\s*,\s*Pakistan)?\s*$/i, "")
    .replace(/\s+/g, " ");
}

/** Display title e.g. "Ali Town, Lahore" */
export function formatAreaTitle(raw: string): string {
  const name = cleanAreaName(raw);
  if (!name) return APP_CITY;
  if (/lahore/i.test(name)) return name;
  return `${name}, ${APP_CITY}`;
}

/** WAQI station label without broken "(nearest to X,)" suffix. */
export function cleanStationLabel(station: string | undefined): string | undefined {
  if (!station?.trim()) return undefined;
  return station
    .trim()
    .replace(/\s*\(nearest to [^)]+\)\s*/gi, "")
    .replace(/,+\s*$/g, "")
    .replace(/\s+/g, " ");
}
