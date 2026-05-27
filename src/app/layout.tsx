import type { Metadata } from "next";
import "./globals.css";
import AuthInit from "@/components/auth-init";

export const metadata: Metadata = {
  title: "AI Assistant",
  description: "Next-gen AI Orchestrator with Deep Research & Infinite Context.",
  manifest: "/manifest.json",
  themeColor: "#050505",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI Assistant",
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
