import type { Metadata } from "next";
import Script from "next/script";
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
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/*
          描画前にテーマを確定させ、リロード時の白/黒のちらつきを防ぐ。
          React が動くより前に実行する必要があるため、インラインで置いている。
        */}
        <Script
          id="keashiru-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
  var c = localStorage.getItem('keashiru-theme') || 'system';
  var dark = c === 'dark' || (c === 'system' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches);
  var r = document.documentElement;
  r.setAttribute('data-theme', dark ? 'dark' : 'light');
  r.dataset.themeChoice = c;
}catch(e){}})();`,
          }}
        />
      </head>
      {/* 背景と文字色は globals.css のトークンが決める（テーマ切替のため） */}
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
