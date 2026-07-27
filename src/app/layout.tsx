import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AuthProvider } from "@/components/AuthProvider";
import pkg from "../../package.json";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plant Care",
  description: "Identify plants, diagnose issues, and track watering, fertilizing, and misting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <footer className="mt-auto border-t border-gray-200 py-4">
          <div className="mx-auto max-w-4xl px-6 flex justify-end">
            <Link href="/changelog" className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-mono">
              v{pkg.version}
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
