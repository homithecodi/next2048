"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "2048.best";
const NO_BEST = 0;
const listeners = new Set<() => void>();

function readBest(): number {
  if (typeof window === "undefined") return NO_BEST;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = Number.parseInt(raw ?? "", 10);
    return Number.isFinite(parsed) && parsed > NO_BEST ? parsed : NO_BEST;
  } catch {
    return NO_BEST;
  }
}

function writeBest(value: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    return;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  const sync = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", sync);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", sync);
  };
}

export function useBestScore(best: number) {
  const storedBest = useSyncExternalStore(
    subscribe,
    readBest,
    () => NO_BEST
  );

  useEffect(() => {
    if (best > storedBest) writeBest(best);
  }, [best, storedBest]);

  return Math.max(best, storedBest);
}