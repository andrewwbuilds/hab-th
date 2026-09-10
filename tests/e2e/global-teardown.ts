import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const E2E_DOMAIN = "@e2e.encore.dev";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2];
  }
  return env;
}

/** Removes the throwaway accounts the specs create so the seed data stays clean. */
export default async function globalTeardown() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let page = 1;
  let removed = 0;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || data.users.length === 0) break;
    for (const user of data.users) {
      if (user.email?.endsWith(E2E_DOMAIN)) {
        await admin.auth.admin.deleteUser(user.id);
        removed += 1;
      }
    }
    if (data.users.length < 200) break;
    page += 1;
  }
  if (removed > 0) console.log(`e2e teardown: removed ${removed} test account(s)`);
}
