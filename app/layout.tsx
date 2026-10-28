import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FBFBFD",
};

export const metadata: Metadata = {
  title: "ExamBuddy — NPTEL Exam Travel Coordination for Karunya University",
  description:
    "Match with Karunya classmates headed to your NPTEL exam center, coordinate the journey, and split the ride effortlessly.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#FBFBFD] text-[#1D1D1F] antialiased selection:bg-[#0071E3]/20 selection:text-[#0071E3]">
        {children}
      </body>
    </html>
  );
}
