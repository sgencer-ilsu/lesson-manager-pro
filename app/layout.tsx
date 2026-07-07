import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "S.GENCER DERS TAKİP",
  description: "Özel ders takip ve planlama uygulaması",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
