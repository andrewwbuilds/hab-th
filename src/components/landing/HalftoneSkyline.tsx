"use client";

import { useEffect, useRef } from "react";

const ROW = 7;
const BAR = 3;
const BAND = 30;

interface Block {
  x: number;
  width: number;
  top: number;
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Blocks rise toward both edges so the middle stays low behind whatever sits on top. */
function skyline(width: number, height: number, rand: () => number, rise: number): Block[] {
  const blocks: Block[] = [];
  for (let x = 0; x < width; ) {
    const blockWidth = 28 + rand() * 120;
    const fromCentre = Math.abs((x + blockWidth / 2) / width - 0.5) * 2;
    const reach = rise * (0.18 + 0.82 * Math.pow(fromCentre, 1.6)) + (rand() - 0.5) * 0.18;
    blocks.push({ x, width: blockWidth, top: height * (1 - Math.min(0.95, Math.max(0.08, reach))) });
    x += blockWidth;
  }
  return blocks;
}

function paint(ctx: CanvasRenderingContext2D, width: number, height: number, seed: number, rise: number) {
  const rand = seeded(seed);
  const blocks = skyline(width, height, rand, rise);
  for (let y = height - BAR; y >= 0; y -= ROW) {
    const inBand = y >= height - BAND;
    for (const block of blocks) {
      if (!inBand && y < block.top) continue;
      const crown = !inBand && y - block.top < ROW * 2;
      const end = block.x + block.width;
      for (let x = block.x; x < end; ) {
        const length = 4 + rand() * 24;
        if (rand() < (crown ? 0.5 : 0.86)) {
          ctx.globalAlpha = 0.3 + rand() * 0.6;
          ctx.fillStyle = rand() < 0.2 ? "#8b93ea" : "#5e6ad2";
          ctx.fillRect(Math.round(x), y, Math.min(length, end - x), BAR);
        }
        x += length + 2 + rand() * (crown ? 12 : 5);
      }
    }
  }
  ctx.globalAlpha = 1;
}

export interface HalftoneSkylineProps {
  className?: string;
  seed?: number;
  /** 0..1, how high the tallest blocks reach at the edges. */
  rise?: number;
}

export function HalftoneSkyline({ className, seed = 7, rise = 0.9 }: HalftoneSkylineProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      paint(ctx, width, height, seed, rise);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [seed, rise]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
