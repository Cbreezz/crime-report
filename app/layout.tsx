import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";

const geist = localFont({
  src: "./fonts/GeistVF.woff",
  display: "swap",
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "SafeReport - Anonymous Crime Reporting",
  description: "Securely and anonymously report crimes to law enforcement",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "SafeReport",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <script dangerouslySetInnerHTML={{ __html: `if ("serviceWorker" in navigator) { window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {})); }` }} />
        <Providers>
          <div className="relative min-h-screen bg-black selection:bg-sky-500/20">
            {/* Gradient Background */}
            <div className="fixed inset-0 -z-10 min-h-screen">
              <div className="absolute inset-0 h-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.03),transparent_50%)]" />
              <div className="absolute inset-0 h-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.04),transparent_70%)]" />
            </div>
            <Navbar />
            <main className="pt-16">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
