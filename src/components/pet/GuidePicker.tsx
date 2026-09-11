"use client";

import { useEffect, useId, useRef, useState, useTransition, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, Eraser, ImageIcon, Pencil, RefreshCw, Upload } from "lucide-react";
import { Button, Field, Input, Spinner, cn } from "@/components/ui";
import { saveGuide } from "@/lib/data/pets";
import { GUIDES } from "@/lib/pet/guides";
import type { PetSpec } from "@/lib/types";
import { PixelPortrait } from "./PixelPortrait";

type Guide = NonNullable<PetSpec["traits"]["guide"]>;
/** One "your photo" option in the UI; it saves as `portrait` when the model drew it and `photo` (pixels) otherwise. */
type Option = Exclude<Guide["kind"], "portrait">;
/** Drawn: waiting on the model. Offline: no key on the server. Failed: the model call did not return an image. */
type PortraitStatus = "idle" | "drawing" | "offline" | "failed";
const PORTRAIT_SIZE = 256;
const PAPER = "#f5f3e8";
const INKS: readonly string[] = ["#1b1c1f", "#5e6ad2", "#eb5757", "#f2994a", "#4cb782"];
const CUSTOM_SWATCH = "conic-gradient(#eb5757, #f2c94c, #4cb782, #4c9ee0, #c79af5, #eb5757)";
const GUIDE_HINT: Record<(typeof GUIDES)[number]["id"], string> = {
  eddy: "Edward, to be formal",
  gary: "Your personal hype man",
  eric: "One step at a time",
};

function square(source: CanvasImageSource, width: number, height: number, size: number): HTMLCanvasElement {
  const out = document.createElement("canvas"); out.width = out.height = size;
  const side = Math.min(width, height);
  out.getContext("2d")!.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, size, size);
  return out;
}

export function GuidePicker({ pet, returnTo = null }: { pet: PetSpec | null; returnTo?: string | null }) {
  const router = useRouter();
  const saved0 = pet?.traits.guide;
  const [kind, setKind] = useState<Option>(saved0?.kind === "portrait" ? "photo" : saved0?.kind ?? "eddy");
  const [name, setName] = useState(pet?.name ?? "Eddy");
  const [photo, setPhoto] = useState(saved0?.kind === "photo" ? saved0.image : "");
  const [portrait, setPortrait] = useState(saved0?.kind === "portrait" ? saved0.image : "");
  const [portraitStatus, setPortraitStatus] = useState<PortraitStatus>("idle");
  const [resolution, setResolution] = useState(88);
  const [color, setColor] = useState("#5e6ad2");
  const [hasDrawing, setHasDrawing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const ids = useId();
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [camera, setCamera] = useState(false);
  const drawing = useRef(false);
  const uploadVersion = useRef(0);
  const cameraVersion = useRef(0);
  const portraitVersion = useRef(0);
  const stopCamera = () => { cameraVersion.current++; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setCamera(false); };
  useEffect(() => () => { cameraVersion.current++; stream.current?.getTracks().forEach(track => track.stop()); }, []);
  useEffect(() => { if (camera && video.current) video.current.srcObject = stream.current; }, [camera]);
  useEffect(() => {
    if (kind !== "drawing" || !canvas.current) return;
    const ctx = canvas.current.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f5f3e8"; ctx.fillRect(0, 0, 256, 256);
    if (pet?.traits.guide?.kind === "drawing") {
      const img = new Image(); let active = true;
      img.onload = () => { if (active) ctx.drawImage(img, 0, 0, 256, 256); };
      img.src = pet.traits.guide.image;
      return () => { active = false; };
    }
  }, [kind, pet]);
  function select(next: Option) {
    stopCamera(); setKind(next); setSaved(false); setError("");
    setHasDrawing(next === "drawing" && pet?.traits.guide?.kind === "drawing");
    setName(GUIDES.find(guide => guide.id === next)?.name ?? "My guide");
  }
  function paint(event: PointerEvent<HTMLCanvasElement>, start = false) {
    if (!drawing.current && !start) return;
    const el = event.currentTarget; const ctx = el.getContext("2d"); if (!ctx) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 256 / rect.width; const y = (event.clientY - rect.top) * 256 / rect.height;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (start) { drawing.current = true; el.setPointerCapture(event.pointerId); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, y); }
    else { ctx.lineTo(x, y); ctx.stroke(); }
    setHasDrawing(true); setSaved(false);
  }
  /** Sends the square selfie to the server; a stale response (newer photo, or a reset) is dropped. */
  async function stylize(source: string) {
    const version = ++portraitVersion.current;
    setPortrait(""); setPortraitStatus("drawing");
    try {
      const response = await fetch("/api/portrait", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: source }) });
      const json = (await response.json().catch(() => null)) as { image?: string; offline?: boolean } | null;
      if (version !== portraitVersion.current) return;
      if (response.ok && json?.image) { setPortrait(json.image); setPortraitStatus("idle"); return; }
      setPortraitStatus(json?.offline ? "offline" : "failed");
    } catch { if (version === portraitVersion.current) setPortraitStatus("failed"); }
  }
  function takePhoto(source: string) { setPhoto(source); setSaved(false); void stylize(source); }
  async function upload(file?: File) {
    if (!file) return;
    setError(""); setSaved(false);
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) { setError("Choose an image under 15 MB."); return; }
    const version = ++uploadVersion.current;
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      if (version === uploadVersion.current) takePhoto(square(img, img.width, img.height, 512).toDataURL("image/png"));
    } catch { setError("This image could not be opened. Try a JPG or PNG."); }
    finally { URL.revokeObjectURL(url); }
  }
  async function openCamera() {
    setError(""); const version = ++cameraVersion.current;
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (version !== cameraVersion.current) { next.getTracks().forEach(track => track.stop()); return; }
      stream.current = next; setCamera(true);
    } catch { setError("Camera unavailable. Allow camera access or upload a photo below."); }
  }
  function capture() {
    const el = video.current; if (!el?.videoWidth) return;
    takePhoto(square(el, el.videoWidth, el.videoHeight, 512).toDataURL("image/png")); stopCamera();
  }
  function save() {
    setError(""); setSaved(false);
    startTransition(async () => {
      try {
        let image = GUIDES.find(guide => guide.id === kind)?.image as string | undefined;
        let savedKind: Guide["kind"] = kind;
        if (kind === "drawing") image = canvas.current?.toDataURL("image/png");
        if (kind === "photo") {
          const img = new Image(); img.src = portrait || photo; await img.decode();
          if (portrait) { image = square(img, img.width, img.height, PORTRAIT_SIZE).toDataURL("image/png"); savedKind = "portrait"; }
          else {
            const out = document.createElement("canvas"); out.width = out.height = resolution;
            out.getContext("2d")!.drawImage(img, 0, 0, resolution, resolution);
            image = out.toDataURL("image/png");
          }
        }
        if (!image) return;
        const result = await saveGuide(name, { kind: savedKind, image });
        if (!result.ok) { setError(result.error); return; }
        setSaved(true);
        if (returnTo) router.push(returnTo);
        else router.refresh();
      } catch { setError("Could not save your guide. Please try again."); }
    });
  }
  function clearDrawing() {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) { ctx.fillStyle = PAPER; ctx.fillRect(0, 0, 256, 256); }
    setHasDrawing(false); setSaved(false);
  }
  const pixelFallback = !portrait && photo && portraitStatus !== "drawing";
  const photoNote =
    camera ? "Center your face, then take the photo."
    : portraitStatus === "drawing" ? "Adding a little spice to your photo… this takes about ten seconds."
    : portrait ? "Your photo, with a little spice added."
    : portraitStatus === "offline" ? "This server has no image model key, so your guide keeps the pixel look."
    : photo ? "Pixel version of your photo."
    : "Take a selfie or upload one. It gets cropped to a square.";
  const options: { id: Option; label: string; hint: string }[] = [
    ...GUIDES.map(guide => ({ id: guide.id, label: guide.name, hint: GUIDE_HINT[guide.id] })),
    { id: "drawing", label: "Draw your own", hint: "A friend from scratch" },
    { id: "photo", label: "Use your photo", hint: "You, with a little spice added" },
  ];

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-medium text-fg">Who’s coming with you?</h1>
        <p className="text-base text-muted">Pick a familiar face, draw a new friend, or make yourself the main character.</p>
      </header>

      <div aria-label="Choose your guide" className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {options.map(option => {
          const selected = kind === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={pending}
              aria-pressed={selected}
              onClick={() => select(option.id)}
              className={cn(
                "group relative flex items-center gap-3 rounded-panel border px-3 py-2 text-left transition-colors duration-120 ease-out-quick disabled:cursor-not-allowed disabled:opacity-50 sm:flex-col sm:gap-2.5 sm:px-2 sm:py-3 sm:text-center",
                selected ? "border-accent bg-accent-soft" : "border-border bg-panel hover:border-border-strong hover:bg-hover",
              )}
            >
              {selected && (
                <span aria-hidden className="absolute right-3 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white sm:right-2 sm:top-2 sm:translate-y-0">
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
              )}
              <OptionArt id={option.id} />
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-medium text-fg">{option.label}</span>
                <span className="text-xs text-muted">{option.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <fieldset disabled={pending} className="flex min-w-0 flex-col rounded-panel border border-border bg-panel">
        {kind === "drawing" && (
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row">
            <canvas
              ref={canvas}
              width={256}
              height={256}
              aria-label="Draw your guide here"
              onPointerDown={event => paint(event, true)}
              onPointerMove={event => paint(event)}
              onPointerUp={() => { drawing.current = false; }}
              onPointerCancel={() => { drawing.current = false; }}
              className="size-48 shrink-0 cursor-crosshair rounded-panel"
              style={{ touchAction: "none", background: PAPER }}
            />
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-fg">Draw your guide</span>
                <p className="text-sm text-muted">Anything goes. It keeps you company on the form.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted">Ink</span>
                <div className="flex items-center gap-2">
                  {INKS.map(ink => (
                    <button
                      key={ink}
                      type="button"
                      aria-label={`Ink ${ink}`}
                      aria-pressed={color === ink}
                      onClick={() => setColor(ink)}
                      className="size-5 rounded-full border border-border-strong ring-accent ring-offset-2 ring-offset-panel aria-pressed:ring-2"
                      style={{ background: ink }}
                    />
                  ))}
                  <label
                    title="Custom color"
                    className={cn(
                      "relative size-5 cursor-pointer overflow-hidden rounded-full border border-border-strong ring-accent ring-offset-2 ring-offset-panel",
                      !INKS.includes(color) && "ring-2",
                    )}
                    style={{ background: INKS.includes(color) ? CUSTOM_SWATCH : color }}
                  >
                    <input type="color" aria-label="Drawing color" value={color} onChange={event => setColor(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                  </label>
                </div>
              </div>
              <Button variant="ghost" icon={<Eraser />} onClick={clearDrawing} disabled={!hasDrawing} className="self-start">
                Clear drawing
              </Button>
            </div>
          </div>
        )}

        {kind === "photo" && (
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row">
            <div className="relative flex size-40 shrink-0 items-center justify-center overflow-hidden rounded-panel bg-bg ring-1 ring-border">
              {camera ? (
                <video ref={video} autoPlay playsInline muted className="size-full object-cover" />
              ) : portrait ? (
                <PixelPortrait src={portrait} kind="portrait" name="Your anime portrait preview" size={160} />
              ) : portraitStatus === "drawing" ? (
                <>
                  <PixelPortrait src={photo} name="Your photo" size={160} resolution={128} className="opacity-40" />
                  <span className="absolute inset-0 flex items-center justify-center"><Spinner size={16} /></span>
                </>
              ) : pixelFallback ? (
                <PixelPortrait src={photo} name="Your pixelated photo preview" size={160} resolution={resolution} />
              ) : (
                <ImageIcon aria-hidden className="size-6 text-dim" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-fg">Your photo</span>
                {portraitStatus === "failed" && !camera ? (
                  <p role="alert" className="text-sm text-danger">The portrait could not be drawn. Save the pixel version or try again.</p>
                ) : (
                  <p aria-live="polite" className="text-sm text-muted">{photoNote}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {camera ? (
                  <>
                    <Button variant="primary" icon={<Camera />} onClick={capture}>Take photo</Button>
                    <Button variant="ghost" onClick={stopCamera}>Cancel camera</Button>
                  </>
                ) : (
                  <Button icon={<Camera />} onClick={openCamera}>Open camera</Button>
                )}
                <Button icon={<Upload />} onClick={() => fileInput.current?.click()}>Upload photo</Button>
                {photo && !camera && (portrait || portraitStatus === "failed") && (
                  <Button variant="ghost" icon={<RefreshCw />} onClick={() => void stylize(photo)}>
                    {portrait ? "Redraw" : "Try again"}
                  </Button>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  aria-label="Upload a photo"
                  className="hidden"
                  onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }}
                />
              </div>
              {pixelFallback && !camera && (
                <label className="flex items-center gap-3 text-sm text-muted">
                  Pixel detail
                  <input
                    type="range"
                    min={48}
                    max={128}
                    step={8}
                    value={resolution}
                    onChange={event => { setResolution(Number(event.target.value)); setSaved(false); }}
                    className="w-32 accent-accent"
                  />
                </label>
              )}
              <p className="mt-auto text-xs text-dim">
                Your photo is sent to the image model once to draw the portrait and is saved to your account only when you save your guide.
              </p>
            </div>
          </div>
        )}

        <div className="p-4">
          <Field label="Guide’s name" htmlFor={`${ids}-name`}>
            <Input
              id={`${ids}-name`}
              size="md"
              maxLength={40}
              value={name}
              onChange={event => { setName(event.target.value); setSaved(false); }}
              className="max-w-72"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
          <div className="mr-auto min-w-0 text-sm">
            {error ? (
              <p role="alert" className="text-danger">{error}</p>
            ) : saved ? (
              <p role="status" className="text-muted">
                {name} is ready.{" "}
                <Link href={returnTo ?? "/app"} className="text-fg underline-offset-2 hover:underline">
                  {returnTo ? "Back to your application" : "Continue to your applications"}
                </Link>
              </p>
            ) : (
              <p className="text-dim">Optional. You can change your guide any time.</p>
            )}
          </div>
          {!pet && returnTo && <Button href={returnTo} variant="ghost">Skip for now</Button>}
          <Button
            variant="primary"
            size="md"
            onClick={save}
            loading={pending}
            disabled={!name.trim() || (kind === "drawing" && !hasDrawing) || (kind === "photo" && (!(photo || portrait) || portraitStatus === "drawing"))}
          >
            Save my guide
          </Button>
        </div>
      </fieldset>
    </section>
  );
}

function OptionArt({ id }: { id: Option }) {
  const guide = GUIDES.find(candidate => candidate.id === id);
  if (guide) return <PixelPortrait src={guide.image} name={guide.name} size={56} className="size-10! sm:size-14!" />;
  const Icon = id === "drawing" ? Pencil : Camera;
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border sm:size-14 border-dashed border-border-strong text-muted transition-colors duration-120 ease-out-quick group-hover:text-fg group-aria-pressed:border-accent group-aria-pressed:text-accent"
    >
      <Icon className="size-5" />
    </span>
  );
}
