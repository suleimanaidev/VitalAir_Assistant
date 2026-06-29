import { NextResponse } from "next/server";

import { serverEnv, requireWaqiKey } from "@/lib/env.server";
import { cleanAreaName } from "@/lib/formatLocation";
import { fetchAqiByAreaName } from "@/lib/waqiServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Location-specific live WAQI: ?area=Johar Town */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const area = cleanAreaName(searchParams.get("area") ?? "");

  if (!area) {
    return NextResponse.json(
      { detail: "Query parameter 'area' is required (e.g. ?area=Johar Town)" },
      { status: 400 }
    );
  }

  if (!serverEnv.waqiApiKey) {
    return NextResponse.json(
      { detail: "WAQI_API_KEY missing in root .env" },
      { status: 503 }
    );
  }

  const data = await fetchAqiByAreaName(requireWaqiKey(), area);

  if (!data) {
    return NextResponse.json(
      {
        detail: `Could not resolve '${area}' in Lahore or fetch WAQI data.`,
      },
      { status: 404 }
    );
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" },
  });
}
