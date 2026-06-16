import { fetchMyProfile } from "@/lib/profileApi";

/** Where to send the user right after login/register. */
export async function resolvePostLoginPath(
  fallback: string
): Promise<string> {
  try {
    const data = await fetchMyProfile();
    if (!data.profile_complete) {
      return "/onboarding?setup=1";
    }
    return fallback;
  } catch {
    // If profile API fails, still collect health info before dashboard
    return "/onboarding?setup=1";
  }
}

export function isProfileSetupPath(pathname: string): boolean {
  return pathname === "/onboarding" || pathname === "/profile";
}
