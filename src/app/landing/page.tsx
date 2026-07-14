import type { Metadata } from "next";
import LandingHero from "@/components/LandingHero";

export const metadata: Metadata = {
  title: "Likeway AI — Premium Next-Gen AI Assistant & Chat Platform",
  description:
    "Experience Likeway AI — the ultimate premium AI assistant, coding partner, and creative suite. Blazing fast responses, private chats, deep web research, and unlimited image generation.",
  alternates: {
    canonical: "https://likeway.in/landing",
  },
  openGraph: {
    title: "Likeway AI — Premium Next-Gen AI Assistant",
    description:
      "Blazing fast AI assistant with deep web research, coding help, and unlimited image generation. Try Likeway AI free.",
    url: "https://likeway.in/landing",
    siteName: "Likeway AI",
    images: [
      {
        url: "https://likeway.in/logo-og.png",
        width: 1200,
        height: 630,
        alt: "Likeway AI Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Likeway AI — Premium Next-Gen AI Assistant",
    description:
      "Blazing fast AI assistant with deep web research, coding help, and unlimited image generation.",
    images: ["https://likeway.in/logo-og.png"],
  },
};

export default function LandingPage() {
  return <LandingHero />;
}
