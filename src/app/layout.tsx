import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { WeddingProvider } from "@/lib/store/provider";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Wedding OS — Your wedding, beautifully planned", template: "%s · Wedding OS" },
  description: "Plan every detail, control every rupee, and enjoy the journey. Wedding planning and wedding investment for Sri Lankan weddings.",
  applicationName: "Wedding OS",
  appleWebApp: { capable: true, title: "Wedding OS", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-LK" className={`${display.variable} ${sans.variable}`}>
      <body>
        <WeddingProvider>{children}</WeddingProvider>
      </body>
    </html>
  );
}
