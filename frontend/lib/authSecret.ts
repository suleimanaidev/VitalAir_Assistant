/** NextAuth secret — must be non-empty or NextAuth shows "server configuration" error. */
export function getNextAuthSecret(): string {
  const secret =
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.VITALAIR_JWT_SECRET?.trim();
  if (secret && secret.length >= 16) {
    return secret;
  }
  return "vitalair-dev-nextauth-secret-change-in-production";
}
