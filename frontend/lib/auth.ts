import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { loginUserServer } from "@/lib/authServer";
import { getNextAuthSecret } from "@/lib/authSecret";
import { verifyBackendToken } from "@/lib/verifyBackendToken.server";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        accessToken: { label: "Access Token", type: "text" },
        userId: { label: "User ID", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const accessToken = credentials?.accessToken?.trim();
        const userId = credentials?.userId?.trim();

        if (accessToken && userId) {
          const verified = await verifyBackendToken(accessToken);
          if (verified && verified.userId === userId) {
            return {
              id: userId,
              email: credentials?.email || verified.email || undefined,
              name: credentials?.name || undefined,
              backendToken: accessToken,
            };
          }
          throw new Error("Session expired. Please sign in again.");
        }

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        try {
          const data = await loginUserServer(
            credentials.email,
            credentials.password
          );

          return {
            id: data.user_id,
            email: data.email,
            name: data.name,
            backendToken: data.access_token,
          };
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Invalid email or password.";
          throw new Error(message);
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.sub = user.id;
        token.backendToken = (user as { backendToken?: string }).backendToken;
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? token.sub ?? "";
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.name = (token.name as string) ?? session.user.name;
      }
      session.backendToken = token.backendToken as string | undefined;
      return session;
    },
  },
  secret: getNextAuthSecret(),
  debug: false,
};
