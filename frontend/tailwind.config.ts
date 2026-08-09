import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vital: {
          bg: "rgb(var(--bg-page-rgb) / <alpha-value>)",
          card: "rgb(var(--bg-card-rgb) / <alpha-value>)",
          border: "rgb(var(--border-rgb) / <alpha-value>)",
          text: "rgb(var(--text-primary-rgb) / <alpha-value>)",
          muted: "rgb(var(--text-secondary-rgb) / <alpha-value>)",
          primary: "rgb(var(--brand-rgb) / <alpha-value>)",
          danger: "#FF4545",
        },
        brand: {
          DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)",
          dark: "rgb(var(--brand-dark-rgb) / <alpha-value>)",
          light: "var(--brand-light)",
          border: "var(--brand-border)",
        },
      },
      backgroundColor: {
        page: "var(--bg-page)",
        card: "var(--bg-card)",
        input: "var(--bg-input)",
        sidebar: "var(--bg-sidebar)",
        navbar: "var(--bg-navbar)",
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
        strong: "var(--border-strong)",
        brand: "var(--border-brand)",
      },
      boxShadow: {
        glow: "var(--shadow-md)",
        "glow-danger": "0 0 40px rgba(255, 69, 69, 0.15)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
