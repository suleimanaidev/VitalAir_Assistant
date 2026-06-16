export interface LahoreWeather {
  city: string;
  temperature_c: number;
  humidity: number;
  feels_like_c: number;
  fetched_at?: string;
}

export async function fetchLahoreWeather(): Promise<LahoreWeather> {
  const res = await fetch("/api/weather", { cache: "no-store" });
  if (!res.ok) throw new Error("Weather unavailable");
  return res.json() as Promise<LahoreWeather>;
}
