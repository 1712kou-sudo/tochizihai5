import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "けあしる | 介護の「見えない時間」可視化 × 保険外サービス横断検索",
  description: "高齢の親族を介護する家族の介護時間を28スロットのタイムラインで可視化。公的保険給付・自治体上乗せ・民間自費サービスを最適に組み合わせ、「いくらで何時間が買い戻せるか」を即座に提示します。",
  keywords: [
    "介護",
    "けあしる",
    "保険外サービス",
    "要介護度",
    "ケアプラン",
    "自費サービス",
    "ヤングケアラー",
    "介護離職防止",
    "自治体DX",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFF8F3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* 見出し=Zen Maru Gothic / 本文=Zen Kaku Gothic New（デザイン仕様） */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@700;900&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* オレンジのブランド体験を保つため、公開画面はライトテーマに統一 */}
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
