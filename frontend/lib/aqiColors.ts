/**
 * EPA & WHO compliant AQI Color Theory Scale (plan §1.9)
 * Tuned for maximum visual contrast on Dark & Light map layers.
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
      color: "#94A3B8",
      glow: "rgba(148, 163, 184, 0.4)",
      label: "Unknown",
      bgLight: "rgba(148, 163, 184, 0.15)",
      textColor: "#CBD5E1",
    };
  }
  if (aqi <= 50) {
    return {
      color: "#10B981", // Emerald Green (Good)
      glow: "rgba(16, 185, 129, 0.55)",
      label: "Good",
      bgLight: "rgba(16, 185, 129, 0.15)",
      textColor: "#34D399",
    };
  }
  if (aqi <= 100) {
    return {
      color: "#F59E0B", // Amber Gold (Moderate)
      glow: "rgba(245, 158, 11, 0.55)",
      label: "Moderate",
      bgLight: "rgba(245, 158, 11, 0.15)",
      textColor: "#FBBF24",
    };
  }
  if (aqi <= 150) {
    return {
      color: "#F97316", // Coral Orange (Unhealthy for Sensitive)
      glow: "rgba(249, 115, 22, 0.55)",
      label: "Unhealthy (Sensitive)",
      bgLight: "rgba(249, 115, 22, 0.15)",
      textColor: "#FB923C",
    };
  }
  if (aqi <= 200) {
    return {
      color: "#EF4444", // Vivid Crimson (Unhealthy)
      glow: "rgba(239, 68, 68, 0.6)",
      label: "Unhealthy",
      bgLight: "rgba(239, 68, 68, 0.15)",
      textColor: "#F87171",
    };
  }
  if (aqi <= 300) {
    return {
      color: "#A855F7", // Electric Violet (Very Unhealthy)
      glow: "rgba(168, 85, 247, 0.6)",
      label: "Very Unhealthy",
      bgLight: "rgba(168, 85, 247, 0.15)",
      textColor: "#C084FC",
    };
  }
  return {
    color: "#E11D48", // Deep Burgundy (Hazardous)
    glow: "rgba(225, 29, 72, 0.7)",
    label: "Hazardous",
    bgLight: "rgba(225, 29, 72, 0.2)",
    textColor: "#FDA4AF",
  };
}

export function aqiColor(aqi: number): string {
  return getAqiTheme(aqi).color;
}

export function aqiColorGlow(aqi: number): string {
  return getAqiTheme(aqi).glow;
}

