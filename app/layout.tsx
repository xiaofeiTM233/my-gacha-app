import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AntdProviders from "./providers";
import SiderLayout from "@/components/SiderLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gacha App | 抽卡统计",
  description: "为什么就是没人去抄一下小黑盒的创意呢？",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body style={{ margin: 0 }}>
        <AntdProviders>
          <SiderLayout>{children}</SiderLayout>
        </AntdProviders>
      </body>
    </html>
  );
}
