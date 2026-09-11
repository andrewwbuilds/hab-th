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

export const DEFAULT_MODELS: Record<Exclude<ProviderName, "offline">, [string, string]> = {
  groq: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
  openrouter: ["google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free"],
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

  const [primary, fallback] = DEFAULT_MODELS[name];
  const override = env.AI_MODEL?.trim();
  const models = override && override !== primary ? [override, primary] : [primary, fallback];
  return { name, apiKey, endpoint: ENDPOINTS[name], models };
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
