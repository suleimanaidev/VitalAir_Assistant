/** Lahore Seasonal Intelligence — Pakistan-specific 4-season calendar (Innovation 3) */

export type LahoreSeasonId =
  | "winter_smog"
  | "spring_dust"
  | "summer_heatwave"
  | "monsoon";

export interface LahoreSeason {
  id: LahoreSeasonId;
  labelEn: string;
  labelUr: string;
}

const HEATWAVE_C = 42;

/** Oct–Jan | Feb–Apr | May–Jul | Aug–Sep */
export function getLahoreSeason(date = new Date()): LahoreSeason {
  const month = date.getMonth() + 1;

  if (month === 10 || month === 11 || month === 12 || month <= 1) {
    return {
      id: "winter_smog",
      labelEn: "Winter smog / sardi",
      labelUr: "Smog / sardi season",
    };
  }
  if (month >= 2 && month <= 4) {
    return {
      id: "spring_dust",
      labelEn: "Spring dust & pollen",
      labelUr: "Spring / beech ka mausam",
    };
  }
  if (month >= 5 && month <= 7) {
    return {
      id: "summer_heatwave",
      labelEn: "Garmi / heatwave",
      labelUr: "Garmi season",
    };
  }
  return {
    id: "monsoon",
    labelEn: "Barsaat / monsoon",
    labelUr: "Barsaat / monsoon",
  };
}

export function isHeatwave(tempC: number): boolean {
  return tempC >= HEATWAVE_C;
}

export function isSmogSeason(seasonId: LahoreSeasonId): boolean {
  return seasonId === "winter_smog";
}
