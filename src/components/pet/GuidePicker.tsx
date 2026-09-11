"use client";

import { useEffect, useRef, useState, useTransition, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { saveGuide } from "@/lib/data/pets";
import { GUIDES } from "@/lib/pet/guides";
import type { PetSpec } from "@/lib/types";
import { PixelPortrait } from "./PixelPortrait";

type Guide = NonNullable<PetSpec["traits"]["guide"]>;
export function GuidePicker({ pet }: { pet: PetSpec | null }) {
  const router = useRouter();
  const [kind, setKind] = useState<Guide["kind"]>(pet?.traits.guide?.kind ?? "eddy");
  const [name, setName] = useState(pet?.name ?? "Eddy");
  const [photo, setPhoto] = useState(pet?.traits.guide?.kind === "photo" ? pet.traits.guide.image : "");
  const [resolution, setResolution] = useState(88);
  const [color, setColor] = useState("#5e6ad2");
  const [hasDrawing, setHasDrawing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [camera, setCamera] = useState(false);
  const drawing = useRef(false);
  const uploadVersion = useRef(0);
  const cameraVersion = useRef(0);
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
  function select(next: Guide["kind"]) {
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
  async function upload(file?: File) {
    if (!file) return;
    setError(""); setSaved(false);
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) { setError("Choose an image under 15 MB."); return; }
    const version = ++uploadVersion.current;
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      const out = document.createElement("canvas"); out.width = out.height = 512;
      const side = Math.min(img.width, img.height);
      out.getContext("2d")!.drawImage(img, (img.width-side)/2, (img.height-side)/2, side, side, 0, 0, 512, 512);
      if (version === uploadVersion.current) setPhoto(out.toDataURL("image/png"));
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
    const out = document.createElement("canvas"); out.width = out.height = 512;
    const side = Math.min(el.videoWidth, el.videoHeight);
    out.getContext("2d")!.drawImage(el, (el.videoWidth-side)/2, (el.videoHeight-side)/2, side, side, 0, 0, 512, 512);
    setPhoto(out.toDataURL("image/png")); setSaved(false); stopCamera();
  }
  function save() {
    setError(""); setSaved(false);
    startTransition(async () => {
      try {
        let image = GUIDES.find(guide => guide.id === kind)?.image as string | undefined;
        if (kind === "drawing") image = canvas.current?.toDataURL("image/png");
        if (kind === "photo") {
          const img = new Image(); img.src = photo; await img.decode();
          const out = document.createElement("canvas"); out.width = out.height = resolution;
          out.getContext("2d")!.drawImage(img, 0, 0, resolution, resolution);
          image = out.toDataURL("image/png");
        }
        if (!image) return;
        const result = await saveGuide(name, { kind, image });
        if (!result.ok) { setError(result.error); return; }
        setSaved(true); router.refresh();
      } catch { setError("Could not save your guide. Please try again."); }
    });
  }
  return <section className="guide-picker">
    <header><p className="guide-kicker">A LITTLE COMPANY FOR THE JOURNEY</p><h1>Who’s coming with you?</h1><p>Pick a familiar face, draw a new friend, or make yourself the main character.</p></header>
    <div className="guide-options" aria-label="Choose your guide">
      {GUIDES.map(guide => <button disabled={pending} key={guide.id} type="button" aria-pressed={kind === guide.id} onClick={() => select(guide.id)}><PixelPortrait src={guide.image} name={guide.name} size={96} /><strong>{guide.name}</strong><span>{guide.id === "eddy" ? "Edward, to be formal" : guide.id === "gary" ? "Your personal hype man" : "One step at a time"}</span></button>)}
      <button disabled={pending} type="button" aria-pressed={kind === "drawing"} onClick={() => select("drawing")}><span className="guide-option-icon">✎</span><strong>Draw your own</strong><span>A friend from scratch</span></button>
      <button disabled={pending} type="button" aria-pressed={kind === "photo"} onClick={() => select("photo")}><span className="guide-option-icon">▧</span><strong>Use your photo</strong><span>You, a little pixelated</span></button>
    </div>
    <fieldset disabled={pending} className="guide-editor">
      {kind === "drawing" && <div className="guide-drawing"><canvas ref={canvas} width={256} height={256} aria-label="Draw your guide here" onPointerDown={event => paint(event, true)} onPointerMove={event => paint(event)} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} style={{ touchAction: "none", width: 256, height: 256, maxWidth: "100%", background: "#f5f3e8", borderRadius: 12 }} /><div className="flex items-center gap-3"><label>Ink <input type="color" aria-label="Drawing color" value={color} onChange={event => setColor(event.target.value)} /></label><Button onClick={() => { const ctx = canvas.current?.getContext("2d"); if (ctx) { ctx.fillStyle = "#f5f3e8"; ctx.fillRect(0, 0, 256, 256); } setHasDrawing(false); }}>Clear drawing</Button></div></div>}
      {kind === "photo" && <div className="flex flex-col items-start gap-4">
        {camera && <><video ref={video} autoPlay playsInline muted className="w-64 rounded-xl" /><div className="flex gap-2"><Button onClick={capture}>Take photo</Button><Button onClick={stopCamera}>Cancel camera</Button></div></>}
        {photo && <><PixelPortrait src={photo} name="Your pixelated photo preview" size={192} resolution={resolution} /><label className="flex flex-col gap-2">Pixel detail <input type="range" min={48} max={128} step={8} value={resolution} onChange={event => { setResolution(Number(event.target.value)); setSaved(false); }} /></label></>}
        {!camera && <Button onClick={openCamera}>Open camera</Button>}
        <label className="flex flex-col gap-2">Or upload a photo<input type="file" accept="image/*" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label><p>Your photo is saved to your account only when you save your guide.</p>
      </div>}
      <label className="guide-name">Guide’s name<input maxLength={40} value={name} onChange={event => { setName(event.target.value); setSaved(false); }} /></label>
      <Button variant="primary" size="md" onClick={save} loading={pending} disabled={!name.trim() || (kind === "drawing" && !hasDrawing) || (kind === "photo" && !photo)}>Save my guide</Button>
    </fieldset>
    {error && <p role="alert" className="text-status-rejected">{error}</p>}
    {saved && <p role="status">{name} is ready! <a className="underline" href="/app">Continue to your applications →</a></p>}
  </section>;
}
