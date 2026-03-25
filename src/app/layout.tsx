import type { Metadata } from "next";
import { Outfit, Nunito } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const outfit = Outfit({
  weight: ["400", "700", "800"],
  subsets: ["latin"],
  variable: "--font-display-var",
  display: "swap",
});

const nunito = Nunito({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-sans-var",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareBee",
  description: "Your health and care record",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CareBee",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${nunito.variable}`}>
      <head>
        <meta name="theme-color" content="#E8A817" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-warmstone-white text-warmstone-800 font-sans antialiased min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
