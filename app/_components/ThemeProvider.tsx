"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useState } from "react";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted] = useState(true);

  if (!mounted) return null;

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
