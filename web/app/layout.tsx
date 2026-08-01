/**
 * @purpose Renderiza el layout raíz para ABDOmegaEditor utilizando fuentes y estilos personalizados.
 * @purpose_en Renders the root layout for ABDOmegaEditor using custom fonts and styles.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:0yadgt
 * @lastUpdated 2026-06-20T12:53:17.785Z
 */

import { Space_Grotesk, Inter } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full bg-background text-foreground font-body">
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
