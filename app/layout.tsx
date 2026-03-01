import type { Metadata } from "next";
import { Kode_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "./components/Navbar";
import { WrongChainBanner } from "./components/WrongChainBanner";

const kodeMono = Kode_Mono({
  variable: "--font-kode-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
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
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>
      </head>
      <body
        className={`${kodeMono.variable} ${dmSans.variable} antialiased`}
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
