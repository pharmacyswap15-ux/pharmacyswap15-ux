import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "فارماسواب — بورصة تبادل الأدوية بين الصيدليات",
    template: "%s · فارماسواب",
  },
  description:
    "منصة فارماسواب لتبادل الأدوية قرب الانتهاء والرواكد بين الصيدليات المصرية المرخصة بنظام جمهور في جمهور، وطلبات النواقص حسب المحافظة والمدينة.",
  applicationName: "PHARMASWAP",
  keywords: ["تبادل أدوية", "نواقص", "صيدليات", "جمهور في جمهور", "PHARMASWAP"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b4a6e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${plexArabic.variable} ${jakarta.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
