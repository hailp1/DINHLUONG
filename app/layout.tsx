import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react"
import { ClientProviders } from "@/components/ClientProviders"
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "ncsStat - Nền tảng Phân tích Thống kê Chuẩn Khoa học",
  description: "Phần mềm thống kê chuyên sâu cho NCS Việt Nam. Hỗ trợ PLS-SEM, CFA, EFA, Cronbach Alpha và AI giải thích kết quả chuẩn APA 7.",
  keywords: ["thống kê ncs", "pls-sem", "cfa", "efa", "cronbach alpha", "phân tích dữ liệu", "nghiên cứu khoa học", "ai giải thích số liệu"],
  icons: {
    icon: '/favicon.svg',
  },
  verification: {
    google: "8CL6Lq3oZfJkk2HA8DhITuFYPTRgqnTBzBL3b0NEY1w",
  },
  openGraph: {
    title: "ncsStat - Thống kê & Phân tích Chuyên sâu",
    description: "Giải pháp dữ liệu cho nghiên cứu sinh. Chính xác, Bảo mật, Tiện lợi.",
    url: "https://ncsstat.ncskit.org",
    siteName: "ncsStat",
    locale: "vi_VN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <ClientProviders>
          {children}
          <Analytics />
        </ClientProviders>
      </body>
    </html>
  );
}
