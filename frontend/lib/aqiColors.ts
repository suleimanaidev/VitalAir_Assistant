/**
 * VitalAir Website Color Theory Scale (plan §1.9)
 * Aligned 100% with website Tailwind theme tokens (vital-primary #00C896, vital-danger #FF4545).
 */

export interface AqiTheme {
  color: string;
  glow: string;
  label: string;
  bgLight: string;
  textColor: string;
}

export function getAqiTheme(aqi: number): AqiTheme {
  if (aqi <= 0) {
    return {
      color: "#8B949E",
      glow: "rgba(139, 148, 158, 0.4)",
      label: "Unknown",
      bgLight: "rgba(139, 148, 158, 0.15)",
      textColor: "#8B949E",
    };
  }
  if (aqi <= 50) {
    return {
      color: "#00C896", // vital-primary (Good)
      glow: "rgba(0, 200, 150, 0.55)",
      label: "Good",
      bgLight: "rgba(0, 200, 150, 0.15)",
      textColor: "#00C896",
    };
  }
  if (aqi <= 100) {
    return {
      color: "#FFD700", // Moderate Gold
      glow: "rgba(255, 215, 0, 0.55)",
      label: "Moderate",
      bgLight: "rgba(255, 215, 0, 0.15)",
      textColor: "#FFD700",
    };
  }
  if (aqi <= 150) {
    return {
      color: "#FFA500", // Sensitive Orange
      glow: "rgba(255, 165, 0, 0.55)",
      label: "Unhealthy for Sensitive Groups",
      bgLight: "rgba(255, 165, 0, 0.15)",
      textColor: "#FFA500",
    };
  }
  if (aqi <= 200) {
    return {
      color: "#FF4545", // vital-danger (Unhealthy)
      glow: "rgba(255, 69, 69, 0.6)",
      label: "Unhealthy",
      bgLight: "rgba(255, 69, 69, 0.15)",
      textColor: "#FF4545",
    };
  }
  if (aqi <= 300) {
    return {
      color: "#9B59B6", // Very Unhealthy Purple
      glow: "rgba(155, 89, 182, 0.6)",
      label: "Very Unhealthy",
      bgLight: "rgba(155, 89, 182, 0.15)",
      textColor: "#B07CC6",
    };
  }
  return {
    color: "#8B0000", // Hazardous Deep Red
    glow: "rgba(139, 0, 0, 0.7)",
    label: "Hazardous",
    bgLight: "rgba(139, 0, 0, 0.2)",
    textColor: "#FF6B6B",
  };
}

export function aqiColor(aqi: number): string {
  return getAqiTheme(aqi).color;
}

export function aqiColorGlow(aqi: number): string {
  return getAqiTheme(aqi).glow;
}

