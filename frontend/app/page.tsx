import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import AgentsSection from "@/components/AgentsSection";
import HowItWorksSection from "@/components/HowItWorksSection";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <AgentsSection />
      <HowItWorksSection />
    </main>
  );
}
