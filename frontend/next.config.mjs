import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";

/** Load VitalAir root `.env` (one file for frontend + backend) */
const { loadEnvConfig } = nextEnv;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
loadEnvConfig(rootDir);

const authSecret =
  process.env.NEXTAUTH_SECRET?.trim() ||
  process.env.VITALAIR_JWT_SECRET?.trim() ||
  "vitalair-dev-nextauth-secret-change-in-production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["react-leaflet"],
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
  env: {
    NEXTAUTH_SECRET: authSecret,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
    BACKEND_URL:
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000",
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },
};

export default nextConfig;
