import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import { RESUME_MAX_CHARS } from "@/lib/ai/resume";

export type ResumeText = { ok: true; text: string } | { ok: false; reason: "unsupported" | "unreadable" | "empty" };

function tidy(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, RESUME_MAX_CHARS);
}

function isPdf(file: File, bytes: Uint8Array): boolean {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return true;
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function isText(file: File): boolean {
  return file.type.startsWith("text/") || /\.(txt|md|markdown)$/i.test(file.name);
}

/** Plain text out of a PDF or text file. Scanned PDFs have no text layer and come back empty. */
export async function extractResumeText(file: File): Promise<ResumeText> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isPdf(file, bytes)) {
    try {
      const pdf = await getDocumentProxy(bytes);
      const { text } = await extractText(pdf, { mergePages: true });
      const clean = tidy(text);
      return clean ? { ok: true, text: clean } : { ok: false, reason: "empty" };
    } catch {
      return { ok: false, reason: "unreadable" };
    }
  }
  if (isText(file)) {
    const clean = tidy(new TextDecoder("utf-8", { fatal: false }).decode(bytes));
    return clean ? { ok: true, text: clean } : { ok: false, reason: "empty" };
  }
  return { ok: false, reason: "unsupported" };
}
