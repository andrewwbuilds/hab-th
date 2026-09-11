export type ProviderName = "groq" | "openrouter" | "offline";

export interface ProviderConfig {
  name: ProviderName;
  apiKey: string;
  endpoint: string;
  models: string[];
}

const ENDPOINTS: Record<Exclude<ProviderName, "offline">, string> = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

/**
 * Tried in order until one answers. The free OpenRouter models share an upstream pool and are often
 * rate-limited, so the chain is long; every model here answered a JSON fill in a few seconds when picked.
 * Left out on purpose: Groq's gpt-oss-20b and qwen3.6 fail strict JSON validation, and OpenRouter's
 * nemotron-3-super writes its reasoning into the message field and takes up to half a minute.
 */
export const DEFAULT_MODELS: Record<Exclude<ProviderName, "offline">, string[]> = {
  groq: ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"],
  openrouter: ["google/gemma-4-31b-it:free", "nex-agi/nex-n2.5-pro:free", "poolside/laguna-s-2.1:free"],
};

export type ProviderEnv = Readonly<Record<string, string | undefined>>;

/** Groq has no image output, so selfie portraits always go through OpenRouter's Images API. */
export const IMAGE_ENDPOINT = "https://openrouter.ai/api/v1/images";

/** No OpenRouter image model is free; these two are the cheapest that take a reference photo (about 4 cents each). */
export const DEFAULT_IMAGE_MODELS: [string, string] = ["google/gemini-3.1-flash-lite-image", "google/gemini-2.5-flash-image"];

export interface ImageProviderConfig {
  apiKey: string;
  endpoint: string;
  models: string[];
}

const OFFLINE: ProviderConfig = { name: "offline", apiKey: "", endpoint: "", models: [] };

function isProviderName(value: string): value is ProviderName {
  return value === "groq" || value === "openrouter" || value === "offline";
}

/**
 * AI_PROVIDER wins when set; otherwise the first provider with a key; otherwise offline.
 * AI_MODEL replaces the primary model and keeps the provider's default as the fallback.
 */
export function resolveProvider(env: ProviderEnv): ProviderConfig {
  const groqKey = env.GROQ_API_KEY?.trim() ?? "";
  const openrouterKey = env.OPENROUTER_API_KEY?.trim() ?? "";
  const requested = env.AI_PROVIDER?.trim().toLowerCase() ?? "";

  let name: ProviderName;
  if (requested && isProviderName(requested)) name = requested;
  else if (groqKey) name = "groq";
  else if (openrouterKey) name = "openrouter";
  else name = "offline";

  if (name === "offline") return OFFLINE;
  const apiKey = name === "groq" ? groqKey : openrouterKey;
  if (!apiKey) return OFFLINE;

  return { name, apiKey, endpoint: ENDPOINTS[name], models: modelsFor(name, env.AI_MODEL) };
}

function modelsFor(name: Exclude<ProviderName, "offline">, override: string | undefined): string[] {
  const defaults = DEFAULT_MODELS[name];
  const chosen = override?.trim();
  return chosen ? [chosen, ...defaults.filter((model) => model !== chosen)] : [...defaults];
}

/**
 * Every provider worth trying, primary first. When the primary's models are all down (a shared free pool
 * rate-limited upstream, say) the other keyed provider answers instead of the regex fallback. AI_MODEL only
 * applies to the primary. AI_PROVIDER=offline turns the list off.
 */
export function resolveProviders(env: ProviderEnv): ProviderConfig[] {
  const primary = resolveProvider(env);
  if (primary.name === "offline") return [];
  const others: ProviderConfig[] = [];
  for (const name of ["groq", "openrouter"] as const) {
    if (name === primary.name) continue;
    const apiKey = (name === "groq" ? env.GROQ_API_KEY : env.OPENROUTER_API_KEY)?.trim() ?? "";
    if (apiKey) others.push({ name, apiKey, endpoint: ENDPOINTS[name], models: modelsFor(name, undefined) });
  }
  return [primary, ...others];
}

/**
 * Portraits need OPENROUTER_API_KEY regardless of which provider answers the chat; AI_PROVIDER=offline turns
 * them off too. AI_IMAGE_MODEL replaces the primary model and keeps the default as the fallback.
 */
export function resolveImageProvider(env: ProviderEnv): ImageProviderConfig | null {
  const apiKey = env.OPENROUTER_API_KEY?.trim() ?? "";
  if (!apiKey || env.AI_PROVIDER?.trim().toLowerCase() === "offline") return null;
  const [primary, fallback] = DEFAULT_IMAGE_MODELS;
  const override = env.AI_IMAGE_MODEL?.trim();
  const models = override && override !== primary ? [override, primary] : [primary, fallback];
  return { apiKey, endpoint: IMAGE_ENDPOINT, models };
}
