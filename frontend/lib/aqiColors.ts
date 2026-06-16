/** EPA AQI color scale (plan §1.9) */
export function aqiColor(aqi: number): string {
  if (aqi <= 50) return "#00C896";
  if (aqi <= 100) return "#FFD700";
  if (aqi <= 150) return "#FFA500";
  if (aqi <= 200) return "#FF4545";
  if (aqi <= 300) return "#9B59B6";
  return "#8B0000";
}
