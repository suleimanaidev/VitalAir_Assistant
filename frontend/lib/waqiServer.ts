/**
 * Real-time WAQI service for Lahore.
 * @see ./waqi/ for implementation
 */
export type { WaqiRaw } from "@/lib/waqi/types";

export {
  fetchAreaAqi,
  fetchAqiByAreaName,
  fetchLahoreAqi,
  fetchAreasInBatches,
} from "@/lib/waqi/service";
