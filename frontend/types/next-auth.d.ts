import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id?: string; role?: string };
    backendToken?: string;
  }

  interface User {
    backendToken?: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    backendToken?: string;
    role?: string;
  }
}
