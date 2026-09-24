import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import "./globals.css";

// The whole system is one typeface at two weights.
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-baloo",
});

export const metadata: Metadata = {
  title: "todo",
  description: "Spanish, all in one: phrases, grammar, diary, games and review.",
};

export const viewport: Viewport = {
  themeColor: "#ffe9b8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Draw into the rounded corners, then inset content with env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={baloo.variable}>
      <body className="bg-shell text-ink antialiased">{children}</body>
    </html>
  );
}
