import type { Metadata } from "next";
import { Inter, Spicy_Rice } from "next/font/google";
import "./globals.css";

// Inter is thee whole app's text font; Spicy Rice is a display face exposed via
// Tailwind's `font-display` (used on the brand mark).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const spicyRice = Spicy_Rice({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-spicy",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Evolut Attendance | Evolut Ecommerce Solutions",
  description:
    "Employee attendance management system for Evolut Ecommerce Solutions — Ecommerce, engineered for scale.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spicyRice.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
