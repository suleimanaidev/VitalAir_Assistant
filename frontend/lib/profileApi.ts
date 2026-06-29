import { parseApiError } from "@/lib/apiError";
import { APP_CITY } from "@/lib/constants";
import type {
  CommuteMode,
  HealthProfile,
  OutdoorTime,
  Sensitivity,
} from "@/store/useVitalAirStore";

/** Same-origin proxy → FastAPI (avoids CORS / wrong API host). */
const PROFILE_ME = "/api/profile/me";

let profileFetchInflight: Promise<ProfileApiResponse> | null = null;

export interface UserProfilePayload {
  name: string;
  age: number;
  conditions: string[];
  city?: string;
  sensitivity: Sensitivity;
  commuteMode: CommuteMode;
  outdoorTime: OutdoorTime;
}

export interface ProfileApiResponse {
  status: string;
  user_id: string;
  profile: {
    name: string;
    age: number;
    conditions: string[];
    city: string;
    sensitivity: Sensitivity;
    commute_mode?: CommuteMode;
    commuteMode?: CommuteMode;
    outdoor_time?: OutdoorTime;
    outdoorTime?: OutdoorTime;
  };
  profile_complete: boolean;
}

export function profilePayloadFromHealth(profile: HealthProfile): UserProfilePayload {
  return {
    name: profile.name,
    age: profile.age,
    conditions: profile.conditions,
    city: profile.city,
    sensitivity: profile.sensitivity,
    commuteMode: profile.commuteMode,
    outdoorTime: profile.outdoorTime,
  };
}

export function healthProfileFromApi(
  p: ProfileApiResponse["profile"]
): HealthProfile {
  return {
    name: p.name,
    age: p.age,
    city: APP_CITY,
    conditions: p.conditions ?? [],
    sensitivity: p.sensitivity ?? "medium",
    commuteMode: p.commuteMode ?? p.commute_mode ?? "car",
    outdoorTime: p.outdoorTime ?? p.outdoor_time ?? "30_60",
  };
}

export async function fetchMyProfile(): Promise<ProfileApiResponse> {
  if (profileFetchInflight) return profileFetchInflight;

  profileFetchInflight = (async () => {
    const res = await fetch(PROFILE_ME, {
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = parseApiError(data, `Profile fetch failed (${res.status})`);
      if (res.status === 404 && msg.toLowerCase() === "not found") {
        throw new Error(
          "Profile service not found. Restart the backend: npm run dev:backend"
        );
      }
      throw new Error(msg);
    }
    return data as ProfileApiResponse;
  })();

  try {
    return await profileFetchInflight;
  } finally {
    profileFetchInflight = null;
  }
}

export async function updateMyProfile(
  profile: UserProfilePayload
): Promise<ProfileApiResponse> {
  const res = await fetch(PROFILE_ME, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...profile, city: APP_CITY }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, `Profile update failed (${res.status})`));
  }
  return data as ProfileApiResponse;
}
