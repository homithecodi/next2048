"use client";

import { useEffect, useRef, useState } from "react";

export type PadDirection = "up" | "down" | "left" | "right";

const DEADZONE = 0.45;
const REPEAT_DELAY = 420;
const REPEAT_INTERVAL = 150;

const DPAD: Array<[number, PadDirection]> = [
  [12, "up"],
  [13, "down"],
  [14, "left"],
  [15, "right"],
];

const CONFIRM_BUTTON = 0;
const RESTART_BUTTONS = [8, 9];

type Handlers = {
  onDirection: (direction: PadDirection) => void;
  onConfirm: () => void;
  onRestart: () => void;
  onActuator: (actuator: GamepadHapticActuator | null) => void;
};

type StickState = {
  direction: PadDirection | null;
  enteredAt: number;
  lastFiredAt: number;
};

function readStick(x: number, y: number): PadDirection | null {
  if (Math.abs(x) < DEADZONE && Math.abs(y) < DEADZONE) return null;
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? "right" : "left";
  return y > 0 ? "down" : "up";
}

function readActuator(pad: Gamepad): GamepadHapticActuator | null {
  const legacy = (pad as Gamepad & { webkitVibrationActuator?: GamepadHapticActuator })
    .webkitVibrationActuator;
  const actuator = pad.vibrationActuator ?? legacy;
  return actuator && typeof actuator.playEffect === "function" ? actuator : null;
}

export function useGamepad(handlers: Handlers) {
  const [connected, setConnected] = useState(false);
  const [label, setLabel] = useState("");
  const handlersRef = useRef(handlers);
  const buttonsRef = useRef<boolean[]>([]);
  const stickRef = useRef<StickState>({
    direction: null,
    enteredAt: 0,
    lastFiredAt: 0,
  });
  const attachedRef = useRef(false);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
      return;
    }

    let frame = 0;
    let activeId: string | null = null;

    const forget = () => {
      activeId = null;
      buttonsRef.current = [];
      stickRef.current = { direction: null, enteredAt: 0, lastFiredAt: 0 };
      if (attachedRef.current) {
        attachedRef.current = false;
        handlersRef.current.onActuator(null);
      }
      setConnected(false);
      setLabel("");
    };

    const poll = (now: number) => {
      frame = requestAnimationFrame(poll);
      const pad = navigator.getGamepads().find((entry) => entry?.connected);
      if (!pad) {
        if (activeId !== null) forget();
        return;
      }

      if (activeId !== pad.id) {
        activeId = pad.id;
        buttonsRef.current = [];
        setConnected(true);
        setLabel(pad.id);
      }

      const actuator = readActuator(pad);
      if (actuator && !attachedRef.current) {
        attachedRef.current = true;
        handlersRef.current.onActuator(actuator);
      }

      const buttons = pad.buttons;
      const down = buttonsRef.current;
      const isDown = (index: number) => buttons[index]?.pressed ?? false;

      for (const [index, direction] of DPAD) {
        const pressed = isDown(index);
        if (pressed && !down[index]) handlersRef.current.onDirection(direction);
        down[index] = pressed;
      }

      for (const index of RESTART_BUTTONS) {
        const pressed = isDown(index);
        if (pressed && !down[index]) handlersRef.current.onRestart();
        down[index] = pressed;
      }

      const confirmPressed = isDown(CONFIRM_BUTTON);
      if (confirmPressed && !down[CONFIRM_BUTTON]) handlersRef.current.onConfirm();
      down[CONFIRM_BUTTON] = confirmPressed;

      const direction = readStick(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      const stick = stickRef.current;
      if (direction !== stick.direction) {
        stick.direction = direction;
        if (direction) {
          stick.enteredAt = now;
          stick.lastFiredAt = now;
          handlersRef.current.onDirection(direction);
        }
      } else if (
        direction &&
        now - stick.enteredAt >= REPEAT_DELAY &&
        now - stick.lastFiredAt >= REPEAT_INTERVAL
      ) {
        stick.lastFiredAt = now;
        handlersRef.current.onDirection(direction);
      }
    };

    frame = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(frame);
      forget();
    };
  }, []);

  return { connected, label };
}