import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header, Footer } from "@/components/Header";
import { LocaleProvider } from "@/i18n/provider";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "WOKLE — Learn what’s happening in the world", template: "%s · WOKLE" },
  description:
    "A daily five-challenge game about history, rights, science and social issues. Every answer comes with an explanation and sources.",
  openGraph: {
    siteName: "WOKLE",
    title: "WOKLE — Learn what’s happening in the world",
    description: "Five challenges. One new perspective every day.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#131018" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <LocaleProvider>
          <Header />
          <main className="mx-auto w-full max-w-2xl px-5">{children}</main>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
