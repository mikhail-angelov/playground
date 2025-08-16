import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ProjectStoreProvider } from "@/components/providers/ProjectStoreProvider";
import { getUser } from "@/services/authService";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JS2Go",
  description:
    "JS2Go is your online playground for web development. Instantly build, preview, and share HTML, CSS, and JavaScript projects. Explore trending projects, get inspired, and join a creative coding community.",
  keywords: [
    "JS2Go",
    "web playground",
    "frontend projects",
    "HTML",
    "CSS",
    "JavaScript",
    "code sharing",
    "web development",
    "online IDE",
    "creative coding",
  ],
  openGraph: {
    title: "JS2Go",
    description:
      "Create, share, and discover frontend projects instantly with JS2Go.",
    url: "https://js2go.ru",
    siteName: "JS2Go",
    images: [
      {
        url: "https://js2go.ru/og-image.png",
        width: 1200,
        height: 630,
        alt: "JS2Go Playground",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JS2Go",
    description:
      "Create, share, and discover frontend projects instantly with JS2Go.",
    site: "@js2go",
    images: ["https://js2go.ru/og-image.png"],
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userPromise = getUser();
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <AuthProvider userPromise={userPromise}>
          <ProjectStoreProvider>{children}</ProjectStoreProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
