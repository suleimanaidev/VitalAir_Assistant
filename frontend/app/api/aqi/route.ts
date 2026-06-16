import { NextResponse } from "next/server";

import { serverEnv, requireWaqiKey } from "@/lib/env.server";
import { fetchLahoreAqi } from "@/lib/waqiServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!serverEnv.waqiApiKey) {
    return NextResponse.json(
      { detail: "WAQI_API_KEY missing in root .env" },
      { status: 503 }
    );
  }

  const data = await fetchLahoreAqi(requireWaqiKey());

  if (!data) {
    return NextResponse.json(
      { detail: "Unable to load live Lahore air quality from WAQI." },
      { status: 503 }
    );
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" },
  });
}
