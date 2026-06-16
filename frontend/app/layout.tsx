import type { Metadata } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "VitalAir Assistant | Smog Safety & Route Planning — Lahore",
  description:
    "Multi-agent AI for real-time air quality, health alerts, nutrition tips, and safer routes in Lahore, Pakistan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-vital-bg text-vital-text">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
