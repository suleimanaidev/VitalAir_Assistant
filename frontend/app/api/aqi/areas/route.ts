import { NextResponse } from "next/server";

import { serverEnv, requireWaqiKey } from "@/lib/env.server";
import { LAHORE_AREAS } from "@/lib/lahoreAreas";
import { fetchAreasInBatches } from "@/lib/waqiServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SERVER_CACHE_MS = 45_000;
let cache: { at: number; body: unknown } | null = null;

export async function GET() {
  if (!serverEnv.waqiApiKey) {
    return NextResponse.json(
      { detail: "WAQI_API_KEY missing in root .env" },
      { status: 503 }
    );
  }

  const now = Date.now();
  if (cache && now - cache.at < SERVER_CACHE_MS) {
    return NextResponse.json(cache.body, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  }

  const token = requireWaqiKey();
  const areas = await fetchAreasInBatches(token, LAHORE_AREAS);

  if (areas.length === 0) {
    return NextResponse.json(
      { detail: "Unable to load Lahore area air quality from WAQI." },
      { status: 503 }
    );
  }

  const body = {
    city: "Lahore",
    country: "Pakistan",
    source: "waqi",
    count: areas.length,
    areas,
    fetched_at: new Date().toISOString(),
  };

  cache = { at: now, body };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}
