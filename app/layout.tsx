import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sign OCR Extraction System",
  description: "Extract and visualize sign numbers from architectural PDFs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}