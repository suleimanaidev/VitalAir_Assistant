import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vital: {
          bg: "#0D1117",
          card: "#161B22",
          border: "#30363D",
          text: "#E6EDF3",
          muted: "#8B949E",
          primary: "#00C896",
          danger: "#FF4545",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(0, 200, 150, 0.15)",
        "glow-danger": "0 0 40px rgba(255, 69, 69, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
