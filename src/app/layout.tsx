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
      <body className="relative min-h-dvh bg-canvas text-ink antialiased">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="h-full w-full object-cover opacity-90"
            aria-hidden="true"
          >
            <source src="/screen.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.62),_rgba(255,255,255,0.18)_38%,_rgba(255,255,255,0.15)_100%)]" aria-hidden="true" />
        </div>

        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
