/** EPA AQI category labels (US scale). */
export function aqiLabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

/** Compact label for small UI cells */
export function aqiShortLabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very bad";
  return "Hazardous";
}

export function aqiHealthHint(aqi: number): string {
  return aqiHealthAdvice(aqi).en;
}

/** English + Roman Urdu health advice for a given AQI level. */
export function aqiHealthAdvice(aqi: number): { en: string; ur: string } {
  if (aqi >= 300) {
    return {
      en: "Hazardous — avoid all outdoor activity. Stay indoors with windows closed.",
      ur: "Bohat khatarnak — bahir mat jayein. Darwaze band kar ke ghar mein rahein.",
    };
  }
  if (aqi >= 200) {
    return {
      en: "Very unhealthy — limit outdoor exertion. Use N95 if you must go out.",
      ur: "Bohat unhealthy — kam se kam bahir jayein. Zaroorat par N95 mask pehnein.",
    };
  }
  if (aqi >= 150) {
    return {
      en: "Unhealthy for sensitive groups — children, elderly, and asthmatics should stay indoors.",
      ur: "Sensitive log (bachay, buzurg, asthma) ghar mein rahein.",
    };
  }
  if (aqi >= 100) {
    return {
      en: "Moderate — sensitive individuals should reduce prolonged outdoor exertion.",
      ur: "Moderate — sensitive log lambi outdoor activity kam karein.",
    };
  }
  if (aqi >= 76) {
    return {
      en: "Air is acceptable for most people — only very sensitive groups may feel mild effects.",
      ur: "Zyada tar log ke liye theek — sirf bohat sensitive log thori ehtiyat karein.",
    };
  }
  if (aqi >= 51) {
    return {
      en: "Air quality is okay today — normal outdoor activities are fine for most people.",
      ur: "Aaj hawa theek hai — aam log aam bahir kaam kar sakte hain.",
    };
  }
  return {
    en: "Good air quality — enjoy outdoor activities normally.",
    ur: "Hawa achi hai — aam outdoor activities kar sakte hain.",
  };
}

const STALE_STATION_MS = 6 * 60 * 60 * 1000;

export function formatAqiUpdated(
  iso: string,
  stationReportedAt?: string
): string {
  try {
    const fetched = new Date(iso);
    const mins = Math.floor((Date.now() - fetched.getTime()) / 60000);
    let line: string;
    if (mins < 1) line = "Updated just now";
    else if (mins < 60) line = `Updated ${mins} min ago`;
    else if (mins < 24 * 60) {
      const hrs = Math.floor(mins / 60);
      line = `Updated ${hrs} hr${hrs === 1 ? "" : "s"} ago`;
    } else line = `Updated ${fetched.toLocaleString()}`;

    if (stationReportedAt) {
      const station = new Date(stationReportedAt);
      if (
        !Number.isNaN(station.getTime()) &&
        Date.now() - station.getTime() > STALE_STATION_MS
      ) {
        const stationLabel = station.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        });
        return `${line} · nearest station last reported ${stationLabel}`;
      }
    }
    return line;
  } catch {
    return "Recently updated";
  }
}

export interface ForecastDay {
  day: string;
  aqi: number;
}

export interface AqiBreakdown {
  pm25: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  co?: number;
  so2?: number;
}

export interface LiveAqiPayload {
  city: string;
  aqi: number;
  label: string;
  pm25: number;
  /** WAQI iaqi.pm25 — EPA sub-index, not µg/m³ */
  pm25_index?: number;
  breakdown?: AqiBreakdown;
  dominent?: string;
  updated_at: string;
  source: "waqi";
  station?: string;
  station_reported_at?: string;
  fetched_at?: string;
  forecast?: ForecastDay[];
  health_advice_en?: string;
  health_advice_ur?: string;
  lat?: number;
  lon?: number;
  location_source?: "area_mapping" | "geocode";
  /** How the reading was fetched: geo at coordinates or nearest station feed */
  fetch_method?: "geo" | "station" | "interpolated";
  /** True when WAQI station reading is older than 3 hours */
  is_stale?: boolean;
}

export interface AreaAqiPayload extends LiveAqiPayload {
  area_id: string;
  area: string;
}
