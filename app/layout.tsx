import type { Metadata } from "next";
import { Kode_Mono, Geist } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "./components/Navbar";
import { WrongChainBanner } from "./components/WrongChainBanner";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const kodeMono = Kode_Mono({
  variable: "--font-kode-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Agora",
  description: "Decentralized events for Web3 communities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body
        className={`${kodeMono.variable} ${GeistSans.variable} antialiased overflow-x-hidden`}
      >
        <Providers>
          <Navbar />
          <WrongChainBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
