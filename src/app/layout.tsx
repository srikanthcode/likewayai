import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthInit from "@/components/auth-init";
import { AuthProvider } from "@/components/AuthProvider";

const SITE_URL = "https://www.likeway.in";

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Likeway AI — Free AI Chat Assistant, Code Generator & Deep Research Tool",
    template: "%s | Likeway AI"
  },
  description:
    "Likeway AI is a free premium AI assistant for chat, coding, deep web research, and image generation. Powered by advanced AI models, voice commands, and 90+ slash commands. No limits. Try now at likeway.in.",
  keywords: [
    "likeway ai", "ai chat", "free ai assistant", "ai coding assistant",
    "deep research ai", "ai image generator", "ai chatbot",
    "code generator ai", "ai writing assistant", "voice ai assistant",
    "ai research tool", "free ai tool", "likeway.in", "aixphonic",
    "ai assistant india", "best ai chat", "ai tool 2024", "ai tool 2025",
    "ai for developers", "ai programming help", "deep web research tool",
    "ai creative suite", "slash commands ai", "ai productivity tool",
    "ai summarizer", "ai translator", "ai code review"
  ],
  authors: [{ name: "Srikanth M", url: "https://www.linkedin.com/in/srikanth-m-75a86235a" }],
  creator: "Srikanth M (CEO of Aixphonic)",
  publisher: "Aixphonic Pvt Ltd",
  alternates: {
    canonical: SITE_URL,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Likeway AI",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "Likeway AI — Free AI Chat Assistant & Deep Research Tool",
    title: "Likeway AI — Free AI Chat Assistant, Code Generator & Deep Research",
    description:
      "Likeway AI: Free premium AI assistant for chat, coding, deep research & image generation. Advanced AI models, 90+ slash commands, voice input. No limits. Try free.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Likeway AI — Free AI Chat Assistant & Deep Research Platform",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Likeway AI — Free AI Chat Assistant & Deep Research Tool",
    description:
      "Free premium AI assistant for chat, coding, deep research & image generation. Advanced AI models, 90+ slash commands. Try free at likeway.in",
    images: ["/og-image.png"],
    creator: "@srikanthcodes",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
  other: {
    "google-site-verification": "gWhPSLMVUSzGW5XJqpbDYEIoTkH2O0RDLHmsTApMU1M",
    "msvalidate.01": "",
    "theme-color": "#050505",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "format-detection": "telephone=no",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Likeway AI",
    url: SITE_URL,
    description:
      "Free premium AI assistant for chat, coding, deep web research, and image generation powered by advanced AI models.",
    applicationCategory: "UtilityApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    author: {
      "@type": "Organization",
      name: "Aixphonic Pvt Ltd",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Aixphonic Pvt Ltd",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "150",
    },
  };

  return (
    <html
      lang="en"
      className="h-full antialiased"
      dir="ltr"
    >
      <head>
        <link rel="canonical" href={SITE_URL} />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="bingbot" content="index, follow" />
        <meta name="application-name" content="Likeway AI" />
        <meta name="apple-mobile-web-app-title" content="Likeway AI" />
        <meta name="msapplication-TileColor" content="#050505" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta name="theme-color" content="#050505" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <AuthProvider>
          <AuthInit />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
