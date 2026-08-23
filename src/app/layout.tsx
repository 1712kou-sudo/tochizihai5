import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ケアタイムライン | 介護の「見えない時間」可視化 × 保険外サービス横断検索",
  description: "高齢の親族を介護する家族の介護時間を28スロットのタイムラインで可視化。公的保険給付・自治体上乗せ・民間自費サービスを最適に組み合わせ、「いくらで何時間が買い戻せるか」を即座に提示します。",
  keywords: [
    "介護",
    "ケアタイムライン",
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
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
