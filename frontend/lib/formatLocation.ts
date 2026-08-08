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

/** Extract ONE single exact location/station name (e.g. "Civil Secretariat" or "Data Darbar") */
export function extractExactStationName(
  rawStation: string | undefined,
  city: string | undefined
): string {
  const fallbackCity = cleanAreaName(city || "Lahore");

  if (!rawStation || !rawStation.trim()) {
    return fallbackCity || "Lahore Station";
  }

  let s = rawStation.trim();

  // If string contains "nearest monitor: X" -> extract X directly
  if (/nearest monitor:\s*(.+)$/i.test(s)) {
    const match = s.match(/nearest monitor:\s*(.+)$/i);
    if (match && match[1]) {
      s = match[1].trim();
    }
  }

  // If string is generic "Estimated for X" or "Estimated from nearby..." -> use fallback city
  if (/estimated from nearby/i.test(s) || s.toLowerCase().startsWith("estimated for")) {
    if (!/nearest monitor:/i.test(rawStation)) {
      s = fallbackCity;
    }
  }

  // Remove trailing ", Lahore, Pakistan" or ", Lahore"
  s = s
    .replace(/\s*,\s*Lahore(\s*,\s*Pakistan)?\s*$/i, "")
    .replace(/\s*\(nearest to [^)]+\)\s*/gi, "")
    .replace(/,+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return s || fallbackCity || "Lahore Station";
}
