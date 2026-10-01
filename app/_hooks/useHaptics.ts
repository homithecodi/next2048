"use client";

import { useCallback, useEffect, useRef } from "react";

export type HapticKind =
  | "move"
  | "blocked"
  | "merge"
  | "start"
  | "win"
  | "gameover";

type Step = { duration: number; strong: number; weak: number };
type Pattern = { gap: number; steps: Step[] };

const PATTERNS: Record<HapticKind, Pattern> = {
  move: {
    gap: 0,
    steps: [{ duration: 38, strong: 0.1, weak: 0.28 }],
  },
  blocked: {
    gap: 45,
    steps: [
      { duration: 20, strong: 0.05, weak: 0.05 },
      { duration: 20, strong: 0.05, weak: 0.05 },
    ],
  },
  merge: {
    gap: 0,
    steps: [
      { duration: 22, strong: 0.35, weak: 0.2 },
      { duration: 85, strong: 0.55, weak: 0.8 },
    ],
  },
  start: {
    gap: 40,
    steps: [
      { duration: 26, strong: 0.3, weak: 0.3 },
      { duration: 45, strong: 0.45, weak: 0.55 },
    ],
  },
  win: {
    gap: 55,
    steps: [
      { duration: 60, strong: 0.35, weak: 0.3 },
      { duration: 70, strong: 0.6, weak: 0.55 },
      { duration: 160, strong: 1, weak: 1 },
    ],
  },
  gameover: {
    gap: 70,
    steps: [
      { duration: 180, strong: 0.5, weak: 0.1 },
      { duration: 260, strong: 0.85, weak: 0.05 },
    ],
  },
};

export function useHaptics() {
  const actuatorRef = useRef<GamepadHapticActuator | null>(null);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);

  const cancel = useCallback(() => {
    clearTimers();
    const actuator = actuatorRef.current;
    if (!actuator) return;
    try {
      void actuator.reset().catch(() => {});
    } catch {}
  }, [clearTimers]);

  const attach = useCallback((actuator: GamepadHapticActuator | null) => {
    if (actuatorRef.current === actuator) return;
    cancel();
    actuatorRef.current = actuator;
  }, [cancel]);

  const pulse = useCallback(
    (kind: HapticKind) => {
      const pattern = PATTERNS[kind];
      cancel();
      let at = 0;
      for (const step of pattern.steps) {
        const id = window.setTimeout(() => {
          const actuator = actuatorRef.current;
          if (actuator) {
            try {
              void actuator
                .playEffect("dual-rumble", {
                  startDelay: 0,
                  duration: step.duration,
                  strongMagnitude: step.strong,
                  weakMagnitude: step.weak,
                })
                .catch(() => {});
            } catch {}
          } else if (typeof navigator.vibrate === "function") {
            navigator.vibrate(step.duration);
          }
        }, at);
        timersRef.current.push(id);
        at += step.duration + pattern.gap;
      }
    },
    [cancel]
  );

  useEffect(() => {
    return () => {
      clearTimers();
      const actuator = actuatorRef.current;
      actuatorRef.current = null;
      if (actuator) {
        try {
          void actuator.reset().catch(() => {});
        } catch {}
      }
    };
  }, [clearTimers]);

  return { pulse, attach };
}