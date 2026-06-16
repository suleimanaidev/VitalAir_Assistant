import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const BACKEND = env.backendUrl.replace(/\/$/, "");

async function backendProfileRequest(
  token: string,
  method: "GET" | "PUT",
  body?: string
) {
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  };
  if (body !== undefined) {
    init.body = body;
  }
  return fetch(`${BACKEND}/api/profile/me`, init);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const token = session?.backendToken;

  if (!token) {
    return NextResponse.json({ detail: "Sign in required" }, { status: 401 });
  }

  try {
    const res = await backendProfileRequest(token, "GET");
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      {
        detail:
          "Backend unreachable. Run npm run dev:backend (port 8000) and try again.",
      },
      { status: 503 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const token = session?.backendToken;

  if (!token) {
    return NextResponse.json({ detail: "Sign in required" }, { status: 401 });
  }

  try {
    const res = await backendProfileRequest(token, "PUT", await req.text());
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      {
        detail:
          "Backend unreachable. Run npm run dev:backend (port 8000) and try again.",
      },
      { status: 503 }
    );
  }
}
