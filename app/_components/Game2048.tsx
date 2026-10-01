"use client";

import { gsap } from "gsap";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Gamepad2,
  RotateCcw,
} from "lucide-react";
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { useGamepad } from "../_hooks/useGamepad";
import { useHaptics } from "../_hooks/useHaptics";
import { useSwipe } from "../_hooks/useSwipe";

const SIZE = 4;
const TARGET = 2048;
const MOVE_DURATION = 0.12;
const SPAWN_DURATION = 0.18;
const MERGE_FLIGHT_DURATION = 0.14;

type Direction = "left" | "right" | "up" | "down";
type Status = "playing" | "won" | "over";
type Tile = { id: number; value: number };
type Board = Array<Array<Tile | null>>;
type Point = { x: number; y: number };
type Placed = Point & { value: number };
type Slot = { row: number; column: number; value: number };
type Merge = [sourceId: number, survivorId: number];

type GameState = {
  board: Board;
  score: number;
  best: number;
  status: Status;
  won: boolean;
  merges: Merge[];
  nextId: number;
  presses: number;
};

type GameAction =
  | { type: "seed" }
  | { type: "move"; direction: Direction }
  | { type: "restart" }
  | { type: "resume" };

type Metrics = { cell: number; unit: number; origin: Point };

const KEY_DIRECTIONS: Record<string, Direction | undefined> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const TILE_STYLES: Record<number, string> = {
  2: "bg-[#eee4da] text-[#776e65] dark:bg-[#3d3c3a] dark:text-[#eee4da]",
  4: "bg-[#ede0c8] text-[#776e65] dark:bg-[#474644] dark:text-[#f0e9d8]",
  8: "bg-[#f2b179] text-white dark:bg-[#6d4c2b] dark:text-white",
  16: "bg-[#f59563] text-white dark:bg-[#7c4f2c] dark:text-white",
  32: "bg-[#f67c5f] text-white dark:bg-[#8b4d2c] dark:text-white",
  64: "bg-[#f65e3b] text-white dark:bg-[#9b4c27] dark:text-white",
  128: "bg-[#edcf72] text-[#776e65] dark:bg-[#8b7b35] dark:text-[#fff8e1]",
  256: "bg-[#edcc61] text-[#776e65] dark:bg-[#8e7d32] dark:text-[#fff8e1]",
  512: "bg-[#edc850] text-[#776e65] dark:bg-[#91812c] dark:text-[#fff8e1]",
  1024: "bg-[#edc53f] text-[#776e65] dark:bg-[#94862a] dark:text-[#fff8e1]",
  2048: "bg-[#edc22e] text-[#776e65] dark:bg-[#978b28] dark:text-[#fff8e1]",
};

const ACTION_STYLE =
  "rounded-lg bg-[#cdc1b4] p-2 text-[#776e65] transition hover:scale-105 active:scale-95 dark:bg-[#4b4a48] dark:text-[#eee4da]";
const BUTTON_STYLE =
  "rounded-lg bg-[#8f7a66] px-4 py-2 font-semibold text-white transition hover:scale-105 active:scale-95 dark:bg-[#bbada0] dark:text-[#2f2e2b]";

function createEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => null)
  ) as Board;
}

function createInitialState(): GameState {
  return {
    board: createEmptyBoard(),
    score: 0,
    best: 0,
    status: "playing",
    won: false,
    merges: [],
    nextId: 0,
    presses: 0,
  };
}

function addRandomTile(board: Board, id: number): Board {
  const empty: Array<[number, number]> = [];
  board.forEach((row, r) =>
    row.forEach((tile, c) => {
      if (tile === null) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const spawned: Tile = { id, value: Math.random() < 0.9 ? 2 : 4 };
  return board.map((row, rowIndex) =>
    row.map((tile, colIndex) => (rowIndex === r && colIndex === c ? spawned : tile))
  );
}

function slide(line: Array<Tile | null>) {
  const tiles = line.filter((tile): tile is Tile => tile !== null);
  const result: Array<Tile | null> = [];
  const merges: Merge[] = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const next = tiles[i + 1];
    if (next && next.value === tile.value) {
      const merged: Tile = { id: tile.id, value: tile.value * 2 };
      result.push(merged);
      merges.push([next.id, merged.id]);
      gained += merged.value;
      i++;
    } else {
      result.push(tile);
    }
  }
  while (result.length < line.length) result.push(null);
  return { line: result, gained, merges };
}

function applyMove(board: Board, direction: Direction) {
  const next = board.map((row) => [...row]);
  const merges: Merge[] = [];
  let gained = 0;

  for (let i = 0; i < SIZE; i++) {
    let result: ReturnType<typeof slide>;
    if (direction === "left") {
      result = slide(next[i]);
      next[i] = result.line;
    } else if (direction === "right") {
      result = slide([...next[i]].reverse());
      next[i] = result.line.reverse();
    } else if (direction === "up") {
      result = slide(next.map((row) => row[i]));
      result.line.forEach((tile, r) => {
        next[r][i] = tile;
      });
    } else {
      result = slide(next.map((row) => row[i]).reverse());
      result.line.reverse().forEach((tile, r) => {
        next[r][i] = tile;
      });
    }
    merges.push(...result.merges);
    gained += result.gained;
  }

  return { board: next, gained, merges };
}

function boardsEqual(a: Board, b: Board) {
  return a.every((row, r) =>
    row.every(
      (tile, c) => tile?.id === b[r][c]?.id && tile?.value === b[r][c]?.value
    )
  );
}

function canMove(board: Board) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = board[r][c]?.value ?? 0;
      if (value === 0) return true;
      if (c + 1 < SIZE && board[r][c + 1]?.value === value) return true;
      if (r + 1 < SIZE && board[r + 1][c]?.value === value) return true;
    }
  }
  return false;
}

function hasTarget(board: Board) {
  return board.some((row) => row.some((tile) => (tile?.value ?? 0) >= TARGET));
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "seed": {
      const seeded = state.board.some((row) => row.some((tile) => tile !== null));
      if (seeded) return state;
      const withOne = addRandomTile(state.board, state.nextId);
      return {
        ...state,
        board: addRandomTile(withOne, state.nextId + 1),
        nextId: state.nextId + 2,
      };
    }
    case "restart": {
      const withOne = addRandomTile(createEmptyBoard(), state.nextId);
      return {
        ...createInitialState(),
        board: addRandomTile(withOne, state.nextId + 1),
        best: state.best,
        nextId: state.nextId + 2,
      };
    }
    case "resume": {
      return { ...state, status: "playing" };
    }
    case "move": {
      if (state.status !== "playing") return state;
      const presses = state.presses + 1;
      const { board, gained, merges } = applyMove(state.board, action.direction);
      if (boardsEqual(board, state.board)) {
        return canMove(board)
          ? { ...state, presses }
          : { ...state, presses, status: "over" };
      }
      const next = addRandomTile(board, state.nextId);
      const score = state.score + gained;
      const won = state.won || hasTarget(next);
      let status: Status = "playing";
      if (won && !state.won) status = "won";
      else if (!canMove(next)) status = "over";
      return {
        board: next,
        score,
        best: Math.max(state.best, score),
        status,
        won,
        merges,
        nextId: state.nextId + 1,
        presses,
      };
    }
  }
}

function tileClass(value: number) {
  if (value > TARGET) {
    return "bg-[#3c3a32] text-white dark:bg-[#edc22e] dark:text-[#3c3a32]";
  }
  return TILE_STYLES[value] ?? TILE_STYLES[2];
}

function tileFont(value: number) {
  if (value >= 1024) return "text-2xl";
  if (value >= 100) return "text-3xl";
  return "text-4xl";
}

function measureLayer(grid: HTMLElement, layer: HTMLElement): Metrics | null {
  const first = grid.firstElementChild as HTMLElement | null;
  if (!first) return null;
  const cell = first.getBoundingClientRect().width;
  if (cell === 0) return null;
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
  const gridRect = grid.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  return {
    cell,
    unit: cell + gap,
    origin: {
      x: gridRect.left - layerRect.left,
      y: gridRect.top - layerRect.top,
    },
  };
}

function spawnGhost(layer: HTMLElement, from: Placed, to: Point, cell: number) {
  const ghost = document.createElement("div");
  ghost.className = `absolute left-0 top-0 flex items-center justify-center rounded-lg font-bold tabular-nums ${tileFont(from.value)} ${tileClass(from.value)}`;
  ghost.style.width = `${cell}px`;
  ghost.style.height = `${cell}px`;
  ghost.textContent = String(from.value);
  layer.appendChild(ghost);
  gsap.fromTo(
    ghost,
    { x: from.x, y: from.y, scale: 1, opacity: 1 },
    {
      x: to.x,
      y: to.y,
      scale: 0.2,
      opacity: 0,
      duration: MERGE_FLIGHT_DURATION,
      ease: "power2.in",
      onComplete: () => ghost.remove(),
    }
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#bbada0] px-3 py-1.5 text-center text-white dark:bg-[#3a3a38]">
      <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
        {label}
      </p>
      <p className="text-lg font-bold tabular-nums">{value.toLocaleString("en-US")}</p>
    </div>
  );
}

const CONTROLS: Array<{
  direction: Direction;
  icon: typeof ChevronUp;
  position: string;
}> = [
  { direction: "up", icon: ChevronUp, position: "col-start-2 row-start-1" },
  { direction: "left", icon: ChevronLeft, position: "col-start-1 row-start-2" },
  { direction: "down", icon: ChevronDown, position: "col-start-2 row-start-2" },
  { direction: "right", icon: ChevronRight, position: "col-start-3 row-start-2" },
];

export default function Game2048() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const gridRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const placedRef = useRef(new Map<number, Placed>());
  const lastBoardRef = useRef(state.board);
  const [coarse, setCoarse] = useState(false);
  const { pulse, attach } = useHaptics();

  const restart = () => {
    pulse("start");
    dispatch({ type: "restart" });
  };

  const pad = useGamepad({
    onDirection: (direction) => dispatch({ type: "move", direction }),
    onConfirm: () => {
      if (state.status === "won") dispatch({ type: "resume" });
      else if (state.status === "over") restart();
    },
    onRestart: restart,
    onActuator: attach,
  });

  useEffect(() => {
    dispatch({ type: "seed" });
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(any-pointer: coarse)");
    const sync = () => setCoarse(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useSwipe(boardRef, (direction) => dispatch({ type: "move", direction }));

  useEffect(() => {
    const previous = lastBoardRef.current;
    lastBoardRef.current = state.board;
    if (state.presses === 0) return;
    if (previous === state.board) pulse("blocked");
    else if (state.status === "won") pulse("win");
    else if (state.status === "over") pulse("gameover");
    else if (state.merges.length > 0) pulse("merge");
    else pulse("move");
  }, [state.presses, state.status, state.board, state.merges, pulse]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const layer = layerRef.current;
    if (!grid || !layer) return;

    const slots = new Map<number, Slot>();
    state.board.forEach((row, r) =>
      row.forEach((tile, c) => {
        if (tile) slots.set(tile.id, { row: r, column: c, value: tile.value });
      })
    );

    const elementOf = (id: number) =>
      layer.querySelector<HTMLElement>(`[data-tile-id="${id}"]`);
    const pointOf = (slot: Slot, metrics: Metrics): Point => ({
      x: metrics.origin.x + slot.column * metrics.unit,
      y: metrics.origin.y + slot.row * metrics.unit,
    });
    const sizeOf = (element: HTMLElement, cell: number) => {
      element.style.width = `${cell}px`;
      element.style.height = `${cell}px`;
    };

    const metrics = measureLayer(grid, layer);
    if (!metrics) return;

    const previous = placedRef.current;
    const placed = new Map<number, Placed>();

    slots.forEach((slot, id) => {
      const element = elementOf(id);
      const point = pointOf(slot, metrics);
      const before = previous.get(id);
      placed.set(id, { ...point, value: slot.value });
      if (!element) return;
      sizeOf(element, metrics.cell);

      if (!before) {
        gsap.fromTo(
          element,
          { ...point, scale: 0.35, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: SPAWN_DURATION,
            ease: "back.out(2.6)",
            overwrite: true,
          }
        );
        return;
      }

      gsap.to(element, {
        x: point.x,
        y: point.y,
        duration: MOVE_DURATION,
        ease: "power2.out",
        overwrite: "auto",
      });
      if (before.value !== slot.value) {
        gsap.fromTo(
          element,
          { scale: 1 },
          {
            scale: 1.22,
            duration: 0.09,
            ease: "power2.out",
            repeat: 1,
            yoyo: true,
            overwrite: "auto",
          }
        );
      }
    });

    state.merges.forEach(([sourceId, survivorId]) => {
      const from = previous.get(sourceId);
      const to = placed.get(survivorId);
      if (from && to) spawnGhost(layer, from, to, metrics.cell);
    });

    placedRef.current = placed;

    let primed = false;
    const observer = new ResizeObserver(() => {
      if (!primed) {
        primed = true;
        return;
      }
      const next = measureLayer(grid, layer);
      if (!next) return;
      slots.forEach((slot, id) => {
        const element = elementOf(id);
        if (!element) return;
        gsap.killTweensOf(element);
        sizeOf(element, next.cell);
        gsap.set(element, pointOf(slot, next));
      });
    });
    observer.observe(grid);

    return () => observer.disconnect();
  }, [state.board, state.merges]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const direction = KEY_DIRECTIONS[event.key];
      if (direction) {
        event.preventDefault();
        dispatch({ type: "move", direction });
        return;
      }
      if (event.key === "r" || event.key === "R") {
        pulse("start");
        dispatch({ type: "restart" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pulse]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full max-w-80 items-end justify-between">
        <div>
          <p className="text-3xl font-bold">2048</p>
          {pad.connected ? (
            <p
              title={pad.label}
              className="flex items-center justify-center gap-1.5 text-xs opacity-60"
            >
              <Gamepad2 size={13} className="shrink-0" />
              D-pad or left stick, Start restarts
            </p>
          ) : (
            <p className="text-xs opacity-60">
              {coarse ? "Swipe the board to play" : "Arrow keys to play, R to restart"}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Stat label="Score" value={state.score} />
          <Stat label="Best" value={state.best} />
        </div>
      </div>

      <div
        ref={boardRef}
        className="relative w-full max-w-80 touch-none rounded-xl bg-[#bbada0] p-2 dark:bg-[#3a3a38]"
      >
        <div ref={gridRef} className="grid grid-cols-4 gap-2">
          {state.board.map((row, r) =>
            row.map((tile, c) => (
              <div
                key={`${r}-${c}`}
                className="aspect-square rounded-lg bg-[#cdc1b4] dark:bg-[#4b4a48]"
              />
            ))
          )}
        </div>

        <div ref={layerRef} className="pointer-events-none absolute inset-0">
          {state.board.flat().map((tile) =>
            tile ? (
              <div
                key={tile.id}
                data-tile-id={tile.id}
                className={`absolute left-0 top-0 flex items-center justify-center rounded-lg font-bold tabular-nums ${tileFont(tile.value)} ${tileClass(tile.value)}`}
              >
                {tile.value}
              </div>
            ) : null
          )}
        </div>

        {state.status !== "playing" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/50 backdrop-blur-sm">
            <p className="text-2xl font-bold text-white">
              {state.status === "won" ? "You win!" : "Game over"}
            </p>
            <p className="text-sm text-white/80">
              Score {state.score.toLocaleString("en-US")}
            </p>
            <div className="flex gap-2">
              {state.status === "won" ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "resume" })}
                  className={BUTTON_STYLE}
                >
                  Keep going
                </button>
              ) : null}
              <button type="button" onClick={restart} className={BUTTON_STYLE}>
                New game
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {CONTROLS.map(({ direction, icon: Icon, position }) => (
          <button
            key={direction}
            type="button"
            aria-label={`Move ${direction}`}
            onClick={() => dispatch({ type: "move", direction })}
            className={`${ACTION_STYLE} ${position}`}
          >
            <Icon className="mx-auto" size={20} />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={restart}
        className="flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold transition hover:scale-105 active:scale-95 dark:bg-gray-800"
      >
        <RotateCcw size={16} />
        New game
      </button>
    </div>
  );
}
