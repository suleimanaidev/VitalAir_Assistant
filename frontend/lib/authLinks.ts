/** Login/register URL that preserves post-auth redirect. */
export function authLink(
  path: string,
  isAuthenticated: boolean,
  mode?: "login" | "register"
): string {
  if (isAuthenticated) return path;
  const params = new URLSearchParams({ callbackUrl: path });
  if (mode === "register") params.set("mode", "register");
  return `/login?${params.toString()}`;
}
