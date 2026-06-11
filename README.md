# xiv-mil-analysis

A FFXIV combat-log analyzer (like [xivanalysis](https://github.com/xivanalysis/xivanalysis))
that **scales its analysis to each player's synced level** — 60/70/80/90 — instead of
assuming the level cap. It never says "you didn't use your level-100 skill" or "you used
it every 120s instead of 90s" when, at that level, the skill doesn't exist or has a
different cooldown.

## Why not fork xivanalysis?

xivanalysis is excellent but its data model is flat and hardcoded at the level cap, and
its per-expansion branches encode *historical* rotations — which are **wrong for synced
content**, because level sync gives you your *current* kit truncated, not the old job.
The change we need is foundational (level-resolution at the core), so we build clean and
harvest xivanalysis's MIT-licensed assets (curated action data, GCD math) à la carte.

## Core idea: the level-resolved data layer

`src/data/` models actions/statuses whose properties change with level via
`LevelScaled<T>` breakpoints. `buildJobData(job, syncedLevel)` collapses them into a
concrete kit. Analysers read that resolved kit and never think about levels.

```
src/
  data/        ← level-scaled action/status model + resolver  (the project's core)
    jobs/war/  ← pilot job seed (Warrior)
  fflogs/      ← minimal FFLogs ingestion (only what the pilot needs)
  parser/      ← analyser base class + parser
  modules/     ← analysers (core = level-agnostic, jobs/ = job-specific)
```

## Status

Early scaffold. Working: the level-resolved data layer + tests. Next: FFLogs client,
GCD-uptime/cooldown-drift analysers, then the WAR rotation pass.

Roadmap: pilot WAR at 70/80 → all jobs at 60/70/80/90, plus a React report UI.

## Run the app (web + API)

Two terminals, from the repo root. You need a FFLogs API client
(https://www.fflogs.com/api/clients) for the credentials.

First, store your credentials once: copy `.env.example` to `.env` and fill it in.
`.env` is gitignored, so the secret stays on your machine.

```powershell
# one-time: create your local .env
Copy-Item .env.example .env    # then edit .env with your client id/secret

# Terminal 1 — API (loads .env, holds the FFLogs secret, runs the analysis core)
npm install
npm run server                 # → http://localhost:8787

# Terminal 2 — web front
cd web; npm install; npm run dev   # → http://localhost:5173
```

Open http://localhost:5173, paste a FFLogs report link, pick your character and a
pull. The browser only ever talks to `/api` (proxied to the local server) — the
FFLogs secret stays server-side.

## Deploy (Cloudflare Pages — free)

The app is built for Cloudflare Pages: the React front is static (`web/dist`),
and the API runs as **Pages Functions** (`functions/api/`, Workers runtime) so
no server is needed. The FFLogs secret lives as an encrypted Pages env var, never
in the repo.

In the Cloudflare dashboard → Workers & Pages → Create → Pages → connect your
GitHub repo, then set:

- **Build command**: `cd web && npm install && npm run build`
- **Build output directory**: `web/dist`
- **Environment variables** (Settings → Environment variables, encrypted):
  - `FFLOGS_CLIENT_ID` and `FFLOGS_CLIENT_SECRET` (from https://www.fflogs.com/api/clients)
  - optionally `NODE_VERSION` = `20`

Functions in `/functions` are auto-detected. The front calls `/api/...` on the
same origin (no proxy in production). Pushes to the repo redeploy automatically.

`wrangler.toml` pins the compatibility date and output dir; you can also deploy
locally with `npx wrangler pages deploy web/dist`.

## Develop

```
npm install
npm test         # vitest
npm run typecheck
```

Data accuracy is the whole point: numbers flagged `unverified` in the job data still need
checking against authoritative game data (xivapi Action/Trait sheets) before they're trusted.
