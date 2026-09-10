import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Reads .env.local into process.env so tests can reach Supabase with the same keys the app uses. */
export function loadLocalEnv(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(__dirname, "../../.env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] === undefined) process.env[key] = value.replace(/^["']|["']$/g, "");
  }
}
