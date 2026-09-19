import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudySync",
  description: "Turn course files into safe, coordinated study sessions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
