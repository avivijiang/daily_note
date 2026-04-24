import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "土拨鼠日记",
  description: "每日时间轴 · 记录生活",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
