export const LIMIT_WINDOW_MS = 60_000;
export const LIMIT_PER_WINDOW = 20;

const calls = new Map<string, number[]>();

/**
 * Sliding window per user, held in module memory. One instance per process, so a multi-instance
 * deploy needs a shared store; for this app a single Vercel region and a low ceiling are enough.
 */
export function allowRequest(userId: string, now = Date.now()): boolean {
  const since = now - LIMIT_WINDOW_MS;
  const recent = (calls.get(userId) ?? []).filter((at) => at > since);
  if (recent.length >= LIMIT_PER_WINDOW) {
    calls.set(userId, recent);
    return false;
  }
  recent.push(now);
  calls.set(userId, recent);
  if (calls.size > 10_000) {
    for (const [key, stamps] of calls) if (!stamps.some((at) => at > since)) calls.delete(key);
  }
  return true;
}

export function resetLimiter(): void {
  calls.clear();
}
