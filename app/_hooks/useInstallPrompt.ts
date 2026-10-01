"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INSTALLABLE_DISPLAY = "(display-mode: standalone)";
const NOT_INSTALLED = false;
const SECURE = true;
const INSECURE_REASON =
  "Installing requires a secure origin. Open this page over HTTPS (or localhost) to install.";

const noop = () => () => {};

function readSecure() {
  if (typeof window === "undefined") return SECURE;
  return window.isSecureContext;
}

function readInstalled() {
  if (typeof window === "undefined") return NOT_INSTALLED;
  return window.matchMedia(INSTALLABLE_DISPLAY).matches;
}

function subscribeInstalled(listener: () => void) {
  const media = window.matchMedia(INSTALLABLE_DISPLAY);
  media.addEventListener("change", listener);
  window.addEventListener("appinstalled", listener);
  return () => {
    media.removeEventListener("change", listener);
    window.removeEventListener("appinstalled", listener);
  };
}

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const installed = useSyncExternalStore(
    subscribeInstalled,
    readInstalled,
    () => NOT_INSTALLED
  );
  const secure = useSyncExternalStore(noop, readSecure, () => SECURE);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return;

    try {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    } catch {
      return;
    }
  }, [prompt]);

  return {
    canInstall: prompt !== null,
    installed,
    install,
    blocked: !secure,
    blockedReason: INSECURE_REASON,
  };
}
