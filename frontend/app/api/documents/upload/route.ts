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
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ detail: "No file provided" }, { status: 400 });
    }

    const outbound = new FormData();
    const name =
      file instanceof File && file.name ? file.name : "health-document.txt";
    outbound.append("file", file, name);

    const res = await fetch(`${BACKEND}/api/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: outbound,
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
