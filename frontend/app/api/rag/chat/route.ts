import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const BACKEND = env.backendUrl.replace(/\/$/, "");

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const token = session?.backendToken;
  if (!token) {
    return NextResponse.json({ detail: "Sign in required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/api/agents/rag-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 503 });
  }
}
