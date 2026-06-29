import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next 2048",
  description: "A 2048 Game Powered by NextJS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}