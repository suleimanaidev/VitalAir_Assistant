import { NextResponse } from "next/server";

const LAHORE = { lat: 31.52, lon: 74.36 };
const CACHE_MS = 15 * 60 * 1000;

let cache: { at: number; data: unknown } | null = null;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(LAHORE.lat));
  url.searchParams.set("longitude", String(LAHORE.lon));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature");
  url.searchParams.set("timezone", "Asia/Karachi");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ detail: "Weather fetch failed" }, { status: 502 });
  }

  const json = (await res.json()) as {
    current?: {
      temperature_2m?: number;
      relative_humidity_2m?: number;
      apparent_temperature?: number;
      time?: string;
    };
  };
  const c = json.current ?? {};
  const temp = c.temperature_2m ?? 0;

  const data = {
    city: "Lahore",
    temperature_c: Math.round(temp * 10) / 10,
    humidity: c.relative_humidity_2m ?? 0,
    feels_like_c: Math.round((c.apparent_temperature ?? temp) * 10) / 10,
    fetched_at: c.time,
  };

  cache = { at: now, data };
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
