import type { Metadata } from "next";
import { Newsreader, Manrope } from "next/font/google";

import { CustomCursor } from "@/components/custom-cursor";
import { LenisProvider } from "@/components/lenis-provider";
import { UserChip } from "@/components/user-chip";

import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Valiz Bitácora",
  description:
    "La bitácora viva de Valiz — objetos de cuero artesanal chileno hechos para envejecer bien.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${newsreader.variable} ${manrope.variable} antialiased`}
    >
      <body className="min-h-screen bg-fondo text-tinta font-sans pt-14 sm:pt-0">
        <CustomCursor />
        <UserChip />
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
