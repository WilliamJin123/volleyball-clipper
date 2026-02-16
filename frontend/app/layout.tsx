import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "@/lib/context/auth-context";
import { ThemeProvider } from "@/lib/context/theme-context";
import { AppShell } from "@/components/layout/app-shell";
import { DitheredBackground } from "@/components/dithered-background/dithered-background";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--next-font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--next-font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--next-font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VolleyClip",
  description: "AI-powered volleyball video analysis and clip generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Theme init — external cacheable script, runs before first paint */}
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-bg-void text-text-primary font-body antialiased">
        <DitheredBackground />
        <ThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
