import type { Metadata, Viewport } from "next";
import { Orbitron, Roboto } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "NetNavi",
  description: "AI Partner & Personal Assistant",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NetNavi",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${orbitron.variable} ${roboto.variable} antialiased bg-slate-950 text-slate-100 font-sans`}
      >
        <Providers>
          <div className="min-h-screen relative overflow-hidden">
            {/* Background Grid Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10 opacity-20" />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
