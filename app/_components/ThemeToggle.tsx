"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full p-3 bg-gray-200 dark:bg-gray-800 hover:scale-110 transition"
    >
      {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
    </button>
  );
}
