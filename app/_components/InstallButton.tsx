"use client";

import { Download, TriangleAlert } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useInstallPrompt } from "../_hooks/useInstallPrompt";

const noop = () => () => {};

const SLOT_STYLE = "block h-11 w-11 rounded-full";
const BUTTON_STYLE =
  "rounded-full p-3 bg-gray-200 dark:bg-gray-800 hover:scale-110 transition";
const BLOCKED_STYLE =
  "block h-11 w-11 rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 p-3";

export default function InstallButton() {
  const { blocked, blockedReason, canInstall, installed, install } =
    useInstallPrompt();
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false
  );

  if (!hydrated) {
    return <span className={SLOT_STYLE} />;
  }

  if (blocked) {
    return (
      <span
        role="img"
        aria-label={blockedReason}
        title={blockedReason}
        className={BLOCKED_STYLE}
      >
        <TriangleAlert size={22} />
      </span>
    );
  }

  if (installed || !canInstall) return null;

  return (
    <button aria-label="Install app" onClick={install} className={BUTTON_STYLE}>
      <Download size={22} />
    </button>
  );
}
