import type { Metadata } from "next";
import LandingHero from "@/components/LandingHero";

export const metadata: Metadata = {
  title: "Likeway AI — Free AI Chat Assistant, Code Generator & Deep Research Tool",
  description:
    "Likeway AI is a free premium AI assistant for chat, coding, deep web research, and image generation. Powered by advanced AI models, voice commands, and 90+ slash commands. No limits. Try now.",
  alternates: {
    canonical: "https://www.likeway.in/landing",
  },
  openGraph: {
    title: "Likeway AI — Free AI Chat Assistant & Deep Research Platform",
    description:
      "Free AI assistant with deep web research, coding help, image generation, and 90+ slash commands. Advanced AI models. No limits. Try free at likeway.in",
    url: "https://www.likeway.in/landing",
    siteName: "Likeway AI",
    images: [
      {
        url: "https://www.likeway.in/og-image.png",
        width: 1200,
        height: 630,
        alt: "Likeway AI — Free AI Chat Assistant & Deep Research Platform",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Likeway AI — Free AI Chat Assistant & Deep Research Tool",
    description:
      "Free AI assistant with deep web research, coding help, image generation & 90+ slash commands. Try free at likeway.in",
    images: ["https://www.likeway.in/og-image.png"],
  },
};

export default function LandingPage() {
  return <LandingHero />;
}
