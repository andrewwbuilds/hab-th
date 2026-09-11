"use client";

import { useEffect, useRef } from "react";

interface PortraitProps { src: string; name: string; size?: number; resolution?: number; className?: string }

/** Stable guide paths also identify accounts saved before the illustrated artwork. */
export function PixelPortrait(props: PortraitProps) {
  const character = /^\/guides\/(eddy|gary|eric)\.png$/.exec(props.src)?.[1];
  if (character) {
    const position = character === "eddy" ? "0%" : character === "gary" ? "50%" : "100%";
    return <span role="img" aria-label={props.name} className={`illustrated-guide ${props.className ?? ""}`} style={{ display: "block", flexShrink: 0, width: props.size ?? 96, height: props.size ?? 96, borderRadius: 10, backgroundImage: "url(/art/encore-guides.png)", backgroundSize: "300% 100%", backgroundPosition: `${position} center`, backgroundRepeat: "no-repeat" }} />;
  }
  return <CustomPixelPortrait {...props} />;
}

function CustomPixelPortrait({ src, name, size = 96, resolution = 88, className }: PortraitProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      const canvas = ref.current;
      if (cancelled || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const side = Math.min(image.width, image.height);
      ctx.clearRect(0, 0, resolution, resolution);
      ctx.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, resolution, resolution);
    };
    image.src = src;
    return () => { cancelled = true; };
  }, [src, resolution]);
  return <canvas ref={ref} width={resolution} height={resolution} role="img" aria-label={name} className={className} style={{ width: size, height: size, imageRendering: "pixelated", borderRadius: 12, objectFit: "cover" }} />;
}
