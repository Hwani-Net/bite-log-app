import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AppInitializer from "@/components/AppInitializer";
import SplashWrapper from "@/components/SplashWrapper";
import PaywallBottomSheet from "@/components/PaywallBottomSheet";
import { Agentation } from "agentation";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://bite-log-app.web.app",
  ),
  title: "BITE Log — 바이트로그",
  description:
    "입질의 순간을 기록하다. AI가 분석하는 입질 시간, 피크타임 예측, 어종별 전문가 채팅까지. 한국 낚시인의 필수 앱.",
  keywords: [
    "낚시",
    "fishing",
    "조황",
    "입질",
    "피크타임",
    "AI",
    "낚시 일지",
    "바이트로그",
    "BITE Log",
    "조과 기록",
  ],
  applicationName: "BITE Log",
  authors: [{ name: "BITE Log Team" }],
  openGraph: {
    title: "BITE Log — 바이트로그",
    description:
      "입질의 순간을 기록하다. AI가 분석하는 입질 시간, 피크타임 예측, 어종별 전문가 채팅까지.",
    type: "website",
    locale: "ko_KR",
    siteName: "BITE Log",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BITE Log — AI 낚시 일지 앱",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BITE Log — 바이트로그",
    description: "입질의 순간을 기록하다. AI 낚시 일지 앱.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Dark mode flash prevention — must be first in <head> */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('fishlog_theme')||'dark';if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}`,
          }}
        />
        {/* Preconnect for font loading performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          rel="stylesheet"
        />
        {/* Material Symbols removed — migrated to Lucide React */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#080d14" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      {/* V4: Stitch body classes — bg-background-light dark:bg-background-dark */}
      <body className="bg-[#080d14] text-slate-900 dark:text-slate-100 antialiased">
        <AppInitializer />
        <SplashWrapper>
          <main className="mx-auto max-w-md min-h-dvh pb-20 relative wave-bg overflow-x-hidden bg-[#080d14]">
            {children}
          </main>
          <BottomNav />
          <PaywallBottomSheet />
        </SplashWrapper>
        {process.env.NODE_ENV === "development" && (
          <Agentation endpoint="http://localhost:4747" />
        )}
      </body>
    </html>
  );
}
