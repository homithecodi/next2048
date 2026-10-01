"use client";

import { useEffect, useRef } from "react";

export type SwipeDirection = "up" | "down" | "left" | "right";

const THRESHOLD = 20;

export function useSwipe(
  target: React.RefObject<HTMLElement | null>,
  onDirection: (direction: SwipeDirection) => void
) {
  const handlerRef = useRef(onDirection);

  useEffect(() => {
    handlerRef.current = onDirection;
  });

  useEffect(() => {
    const element = target.current;
    if (!element) return;

    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let consumed = false;

    const release = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      pointerId = null;
      consumed = false;
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || !event.isPrimary) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      consumed = false;
      try {
        element.setPointerCapture(event.pointerId);
      } catch {}
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId || consumed) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.hypot(dx, dy) < THRESHOLD) return;
      consumed = true;
      handlerRef.current(
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up"
      );
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", release);

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", release);
      element.removeEventListener("pointercancel", release);
    };
  }, [target]);
}