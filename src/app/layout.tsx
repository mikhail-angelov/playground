import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { YandexMetricaProvider } from "next-yandex-metrica";
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

const appUrl = process.env.APP_URL || "http://localhost:3000";
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
    "vibe coding",
  ],
  openGraph: {
    title: "JS2Go",
    description:
      "Create, share, and discover frontend projects instantly with JS2Go.",
    url: appUrl,
    siteName: "JS2Go",
    images: [
      {
        url: `${appUrl}/og-image.png`,
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
    images: [`${appUrl}/og-image.png`],
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userPromise = getUser();
  const yandexMetricaId = process.env.YANDEX_METRICA_ID ? Number(process.env.YANDEX_METRICA_ID) : 0;
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <YandexMetricaProvider
          tagID={yandexMetricaId}
          initParameters={{
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
          }}
          router="app"
        >
          <AuthProvider userPromise={userPromise}>
            <ProjectStoreProvider>{children}</ProjectStoreProvider>
          </AuthProvider>
        </YandexMetricaProvider>
        <Toaster />
      </body>
    </html>
  );
}
