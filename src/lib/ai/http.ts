/** Rate limits, server errors, timeouts and parameter rejections are worth one more try on the fallback model. */
export function retryable(status: number): boolean {
  return status === 400 || status === 408 || status === 429 || status >= 500;
}

/** OpenRouter shows the title and referer on its usage dashboard; both are optional. */
export function openrouterHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`,
    "x-openrouter-title": "Encore",
    "x-title": "Encore",
  };
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) headers["http-referer"] = site;
  return headers;
}
