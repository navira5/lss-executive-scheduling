import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LSS 2027 Calendar Planning Workbench",
  description:
    "A rules-first working draft for Lutheran Social Services of Central Ohio's 2027 annual calendar planning session.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
