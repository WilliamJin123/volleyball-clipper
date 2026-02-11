import type { Metadata } from "next";
import { AuthProvider } from "@/lib/context/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Volleyball Clipper",
  description: "AI-powered volleyball video analysis and clip generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
