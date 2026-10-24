import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Newsreader } from "next/font/google";
import { Providers } from "@/providers/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const siteUrl = "https://drawzware.vercel.app";
const siteTitle = "Drawzware | Free System Design & Architecture Diagram Tool";
const description =
  "Free, open-source tool for visually designing system architectures, microservices, sequence diagrams, and ER diagrams. Build, model, and export technical diagrams directly in your browser.";

export const viewport: Viewport = {
  themeColor: "#1d6f42",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | Drawzware",
  },
  description,
  alternates: {
    canonical: siteUrl,
  },
  keywords: [
    "system design",
    "system architecture",
    "architecture diagram",
    "system design tool",
    "microservices diagram",
    "software architecture",
    "infrastructure diagram",
    "react flow",
    "open source",
    "visual design tool",
    "system design interview",
    "architecture canvas",
  ],
  authors: [{ name: "rajesh", url: siteUrl }],
  creator: "rajesh",
  openGraph: {
    type: "website",
    title: siteTitle,
    description,
    url: siteUrl,
    siteName: "Drawzware",
    images: [
      {
        url: `${siteUrl}/screenshots/canvas-light.png`,
        width: 2880,
        height: 1800,
        alt: "Drawzware — Free System Design & Architecture Diagram Tool",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description,
    images: [`${siteUrl}/screenshots/canvas-light.png`],
  },
  verification: {
    google: "JxtnesJy7pvdqRNF5hluaQ6M_rQ5xECLjBgzGwXBuTM",
  },
  manifest: "/manifest.json",
  applicationName: "Drawzware",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Drawzware",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Resolve the theme before first paint so there is no flash.
// Reads the persisted settings (sdc.settings), falling back to the legacy key.
const themeScript = `
(function() {
  try {
    var pref = 'dark';
    var raw = localStorage.getItem('sdc.settings');
    if (raw) {
      var s = JSON.parse(raw);
      if (s && s.state && s.state.theme) pref = s.state.theme;
    } else {
      var legacy = localStorage.getItem('system-design-canvas-theme');
      if (legacy === 'dark' || legacy === 'light') pref = legacy;
    }
    var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} ${newsreader.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
