import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNextAuthSecret } from "@/lib/authSecret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = NextAuth({
  ...authOptions,
  secret: getNextAuthSecret(),
});

export { handler as GET, handler as POST };
