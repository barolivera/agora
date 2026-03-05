import type { Metadata } from "next";
import { Kode_Mono } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "./components/Navbar";
import { WrongChainBanner } from "./components/WrongChainBanner";

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
    <html lang="en">
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
