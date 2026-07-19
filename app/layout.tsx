import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";
import { Suspense } from "react";
import AppAuthSchutz from "./components/AppAuthSchutz";
import AppNavigation from "./components/AppNavigation";
import { BenutzerProvider } from "./context/BenutzerContext";
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
  title: "Wash Cloud",
  description:
    "Verwaltung für Annahmestellen, Kunden, Lieferscheine, Lieferungen und Rechnungen.",
};

function Ladeanzeige() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow">
        <p className="text-slate-600">
          Anwendung wird geladen ...
        </p>
      </div>
    </main>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <BenutzerProvider>
          <Suspense fallback={<Ladeanzeige />}>
            <AppAuthSchutz>
              <AppNavigation />

              <div className="flex-1">
                {children}
              </div>
            </AppAuthSchutz>
          </Suspense>
        </BenutzerProvider>
      </body>
    </html>
  );
}