import "server-only";

/** Must match backend `Settings.effective_jwt_secret` order in config.py. */
export function getBackendJwtSecret(): string {
  return (
    process.env.JWT_SECRET_KEY?.trim() ||
    process.env.VITALAIR_JWT_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "vitalair-dev-secret-change-me"
  );
}
