#!/usr/bin/env bash
# One-time cloud setup + deploy for Encore.
# Needs: `npx supabase login` done once (opens a browser), `vercel login` done once, and a GitHub remote if you want
# Vercel's git integration (optional; this script deploys from the local tree).
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ask() { local v; read -r -p "$1 " v; echo "$v"; }

say "1/5 Supabase project"
if [ -f supabase/.temp/project-ref ]; then
  REF="$(cat supabase/.temp/project-ref)"
  echo "already linked to project $REF"
else
  npx supabase projects list >/dev/null 2>&1 || { echo "run: npx supabase login"; exit 1; }
  echo "existing projects:"; npx supabase projects list
  REF="$(ask 'project ref to use (leave empty to create a new one):')"
  if [ -z "$REF" ]; then
    echo "organizations:"; npx supabase orgs list
    ORG="$(ask 'org id:')"
    DBPASS="$(ask 'database password for the new project (save it somewhere):')"
    npx supabase projects create encore --org-id "$ORG" --db-password "$DBPASS" --region us-west-1
    echo "waiting for the project to come up (about a minute)"; sleep 75
    npx supabase projects list
    REF="$(ask 'new project ref:')"
  fi
  npx supabase link --project-ref "$REF"
fi

say "2/5 Push schema"
npx supabase db push

say "3/5 Collect keys"
API_URL="https://$REF.supabase.co"
npx supabase projects api-keys --project-ref "$REF"
ANON="$(ask 'anon (or publishable) key:')"
SERVICE="$(ask 'service_role (or secret) key:')"
INVITE="${ORGANIZER_INVITE_CODE:-encore-crew}"
SEEDPW="${SEED_PASSWORD:-encore-demo-2026}"

say "4/5 Seed demo data in the cloud project"
cat > .env.cloud <<ENV
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON
SUPABASE_SERVICE_ROLE_KEY=$SERVICE
ORGANIZER_INVITE_CODE=$INVITE
SEED_PASSWORD=$SEEDPW
ENV
node --env-file=.env.cloud --import tsx scripts/seed.ts

say "5/5 Vercel"
vercel link --yes
for pair in \
  "NEXT_PUBLIC_SUPABASE_URL=$API_URL" \
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON" \
  "SUPABASE_SERVICE_ROLE_KEY=$SERVICE" \
  "ORGANIZER_INVITE_CODE=$INVITE" \
  "SEED_PASSWORD=$SEEDPW"; do
  key="${pair%%=*}"; val="${pair#*=}"
  vercel env rm "$key" production --yes >/dev/null 2>&1 || true
  printf '%s' "$val" | vercel env add "$key" production >/dev/null
done
vercel deploy --prod
say "Done. Put the production URL in README.md and, in the Supabase dashboard, set Authentication -> URL configuration -> Site URL to it."
