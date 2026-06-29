import { NextResponse } from "next/server";

import { cleanAreaName } from "@/lib/formatLocation";
import { searchLocations } from "@/lib/locationSearch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Autocomplete: any Lahore neighborhood (mapped + geocoded). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = cleanAreaName(searchParams.get("q") ?? "");

  const suggestions = await searchLocations(q);
  return NextResponse.json({ suggestions });
}
