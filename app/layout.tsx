import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./_components/ServiceWorkerRegister";
import ThemeProvider from "./_components/ThemeProvider";

export const metadata: Metadata = {
  title: "Next 2048",
  description: "A 2048 Game Powered by NextJS",
  applicationName: "Next 2048",
  appleWebApp: {
    capable: true,
    title: "Next 2048",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
