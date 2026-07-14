import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const BACKEND = env.backendUrl.replace(/\/$/, "");

async function proxyAdmin(
  req: NextRequest,
  pathSegments: string[],
  method: string
) {
  const session = await getServerSession(authOptions);
  const token = session?.backendToken;
  if (!token) {
    return NextResponse.json({ detail: "Sign in required" }, { status: 401 });
  }

  const path = pathSegments.join("/");
  const url = new URL(`${BACKEND}/api/admin/${path}`);
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    const res = await fetch(url.toString(), init);
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 503 });
  }
}

type RouteCtx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyAdmin(req, path, "GET");
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyAdmin(req, path, "POST");
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyAdmin(req, path, "PATCH");
}
