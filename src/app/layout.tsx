import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthInit from "@/components/auth-init";

export const viewport: Viewport = {
  themeColor: "#050505",
};

export const metadata: Metadata = {
  title: {
    default: "Likeway AI — Premium Next-Gen AI Assistant & Chat Platform",
    template: "%s | Likeway AI"
  },
  description: "Experience Likeway AI (likeway.in) — the ultimate premium AI assistant, coding partner, and creative suite created by Aixphonic. Enjoy blazing fast responses, private chats, deep web research, and unlimited image generation without boundaries.",
  keywords: [
    "likeway",
    "likeway.in",
    "likeway ai",
    "likeway assistant",
    "aixphonic",
    "srikanth m",
    "ai chat",
    "premium ai assistant",
    "deep research ai",
    "ai coding assistant",
    "free image generator",
    "next gen ai chat"
  ],
  authors: [{ name: "Srikanth M", url: "https://www.linkedin.com/in/srikanth-m-75a86235a" }],
  creator: "Srikanth M (CEO of Aixphonic)",
  publisher: "Aixphonic",
  metadataBase: new URL("https://likeway.in"),
  alternates: {
    canonical: "https://likeway.in",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Likeway AI",
  },
  openGraph: {
    title: "Likeway AI — Premium Next-Gen AI Assistant & Chat Platform",
    description: "Experience Likeway AI (likeway.in) — the ultimate premium AI assistant, coding partner, and creative suite created by Aixphonic. Enjoy blazing fast responses, private chats, deep web research, and unlimited image generation without boundaries.",
    url: "https://likeway.in",
    siteName: "Likeway AI",
    images: [
      {
        url: "/globe.svg",
        width: 1200,
        height: 630,
        alt: "Likeway AI Platform",
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Likeway AI — Premium Next-Gen AI Assistant & Chat Platform",
    description: "Experience Likeway AI (likeway.in) — the ultimate premium AI assistant, coding partner, and creative suite created by Aixphonic. Enjoy blazing fast responses, private chats, deep web research, and unlimited image generation without boundaries.",
    images: ["/globe.svg"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <AuthInit />
        {children}
      </body>
    </html>
  );
}
