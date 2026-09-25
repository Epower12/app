# YourFriendsLeague — Project Handoff

> Paste this entire file as the first message in a new Claude Code chat to restore full context.
> Working directory: `C:\Users\ejatn\.gemini\antigravity\scratch\sport-predictions`

---

## 1. What this project is

**YourFriendsLeague** (brand name; domain is the shorter `yourfriendleague.com`) — a free-to-play sports score prediction platform. Users predict match scorelines, earn points for accuracy, compete with friends in private/public leagues. Optional Premium subscription (€4.99/mo or €49.99/yr) unlocks league-organizer tools — no scoring advantage.

**Legal entity:** SIA EGATRI (Latvian LLC)
- Registration nr: `50203368661`
- Registered office: Bauskas nov., Codes pag., "Vaidelotes", LV-3901, Latvia
- Not VAT-registered
- Contact: `contact@yourfriendleague.com` (Google Workspace, SPF+DKIM+DMARC all passing, 10/10 mail-tester score)

**Stack:** Next.js 16 (App Router), PostgreSQL on Neon, deployed on Google Cloud Run.

---

## 2. Domains & infrastructure

| Domain | Purpose |
|--------|---------|
| `yourfriendleague.com` (root) | Marketing/content: landing, blog, news, legal pages |
| `app.yourfriendleague.com` | The actual app (login, predictions, leagues, profile, team management) |
| `www.yourfriendleague.com` | Redirects to root via `proxy.ts` |

Both domains map to the **same Cloud Run service** (`sport-predictions`, region `us-central1`, GCP project `project-6b8cb570-b233-4a52-815`). Host-based routing lives in `proxy.ts` at the repo root — it decides which paths are "marketing" (stay on root) vs "app" (redirect to subdomain).

**DNS is on Squarespace** (registrar). Cloud Run domain mappings exist for all three hostnames. SSL certs are Google-managed, auto-renewing.

**⚠️ Known ISP issue:** Whalebone (a Czech DNS security vendor used by Baltic ISPs like Tet/LMT/Bite) had wildcard-flagged `*.yourfriendleague.com` as a false positive, serving a sinkhole cert to users on those networks. A delisting request was emailed to `domain-report@whalebone.io` with proof — check if it's been resolved; if visitors on Baltic ISPs still report SSL warnings, that's the cause, not a real security problem.

**gcloud auth** frequently expires in this environment — if any `gcloud` command fails with an auth error, ask the user to run `gcloud auth login` before retrying.

**⚠️ Repo layout quirk (important, trips people up):** only the `app/` subfolder is a git repository (remote: `github.com/Epower12/app`, branch `main`). `lib/`, `node_modules/`, `package.json`, `next.config.ts`, `tsconfig.json`, `proxy.ts`, `public/`, `design-output/`, `.env.local` all live at the **project root** (one level up from `app/`) and are **NOT tracked by any git repo at all** — they ship purely via the Docker build context when `gcloud builds submit` runs from the project root. This means:
- Edits to `lib/migrations.ts`, `package.json`, etc. never need a commit — they're already "live" on disk and picked up by the next build.
- A git branch/worktree only isolates changes inside `app/` (API routes, pages). Anything in `lib/` is inherently global/shared regardless of branch.
- `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run dev` all run from the **project root**, not from inside `app/`.

---

## 3. Payments — Stripe (LIVE mode)

- Fully integrated: Checkout, Customer Portal, webhooks.
- Two prices: **Monthly** (`price_1TWEW6Lqs2mkzP9Sidw9r3qt`, €4.99) and **Yearly** (`price_1TWEXTLqs2mkzP9SWm9VSoRp`, €49.99 — "2 months free" positioning).
- Env vars already set on Cloud Run: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_WEBHOOK_SECRET`.
- Webhook endpoint: `https://app.yourfriendleague.com/api/stripe/webhook` (registered in Stripe Dashboard, live mode, 6 events).
- Files: `lib/stripe.ts` (client + DB sync helpers), `app/api/stripe/{checkout,portal,webhook}/route.ts`.
- Emails on subscribe/cancel: `sendPremiumWelcomeEmail`, `sendSubscriptionCanceledEmail` in `lib/email.ts`.
- **⚠️ Security note:** established pattern — secrets go straight into `gcloud run services update --update-env-vars`, never repeated back in chat text. This pattern has held for Stripe keys, the Ideogram key, and the Google/Discord OAuth secrets (see §21).

---

## 4. Email

- Transactional sender: `contact@yourfriendleague.com` via Gmail SMTP (`nodemailer`), env vars `EMAIL_FROM` + `EMAIL_PASSWORD` on Cloud Run.
- `lib/email.ts`: `sendWelcomeEmail`, `sendPasswordResetEmail`, `sendPremiumWelcomeEmail`, `sendSubscriptionCanceledEmail`. Shared `htmlWrapper()` dark-themed template.
- DNS records (SPF/DKIM/DMARC) all verified passing — 10/10 mail-tester.io score.

---

## 5. Legal / GDPR compliance

- `/legal`, `/terms`, `/privacy` — full pages, `LegalPageLayout.tsx` shared layout.
- `OrganizationJsonLd` global, `SoftwareApplicationJsonLd` on landing.
- Cookie consent banner (`app/components/CookieConsent.tsx`) — Google Consent Mode v2, persisted `localStorage` key `yfl_consent_v1`.
- Google Analytics (GA4, `G-77L22ZDCPN`) via `app/components/GoogleAnalytics.tsx`, gated behind consent.

---

## 6. Account deletion (GDPR right-to-erasure)

- `/profile` → Danger Zone → `POST /api/user/profile/delete`. Cancels Stripe subscription, hard-deletes in a transaction. Admins blocked from self-delete. Rate-limited 3/hour/IP.

---

## 7. Core prediction-game features (deployed)

- Auth: see §21 — now NextAuth with credentials **and** Google/Discord OAuth.
- Tournaments/leagues: create, join via code, open/private, sport selection.
- Predictions: `ScoreStepper`, playoff tie-blocking, countdown urgency styling, community stats for premium.
- Leaderboard: podium + full ranked table.
- Tournament presets: `lib/presets.ts` (IIHF 2026, 56 matches).
- Team logos: FlagCDN first, TheSportsDB fallback (`lib/countryFlags.ts`, `lib/sportsdb.ts`).
- Owner/admin dashboard at `/owner`.
- **Multi-format leagues** (F1/MotoGP podium, esports/tennis best-of-series) — see §19, now deployed.

---

## 8. Security hardening

- `proxy.ts` (Next.js 16's `middleware.ts` replacement — function must be named `proxy`): security headers, rate-limits credentials login, protects all `/api/*` requiring a session token except an explicit `PUBLIC_API_ROUTES` allowlist.
- `lib/rateLimit.ts`: in-memory sliding window on signup/login/password-reset/checkout/delete-account.
- Password reset tokens SHA-256 hashed, 1-hour expiry.
- `avatarUrl` restricted to relative paths or a trusted-domain allowlist.
- Baseline audited by a security-reviewer agent earlier — look for regressions, not the original issue list.

---

## 9. SEO

- `app/layout.tsx` is a Server Component (full metadata); `SessionProvider` lives in `app/providers.tsx`.
- `app/sitemap.ts` (dynamic, includes blog posts — **user has manually edited this, don't revert**), `app/robots.ts`.
- `/landing` mirrors `/` content but is `noindex` + canonical → `/`.
- OG image: `public/og.png` ("Chromatic Velocity" branded design).
- `next.config.ts` has `images.remotePatterns` for `images.unsplash.com` — **user added this, don't revert.**

---

## 10. News page (`/news`)

- RSS aggregator, 7 sports. `lib/rssSources.ts` (feed registry + off-topic filter), `lib/news.ts` (fetch/normalize/store).
- **ESPN RSS feeds are permanently broken** — don't re-add without testing.
- Cloud Scheduler job `news-refresh-hourly` hits `/api/news/refresh` every hour (needs `NEWS_REFRESH_SECRET` bearer token).
- `lib/db.ts` pool tuned (`connectionTimeoutMillis: 15000`, etc.) after Neon cold-start timeouts.

---

## 11. Blog (`/blog`)

- MDX in `content/blog/*.mdx`, `lib/blog.ts` loader, static-gen per post.

---

## 12. Custom design assets

- **Landing page redesign**: swapped all Unsplash stock photography for custom Ideogram-generated brand imagery. Pipeline: `design-output/ideogram-generate.mjs` (Ideogram v3 API — key goes via `IDEOGRAM_API_KEY` env var, never hardcoded; **now stored in `.env.local` as of 2026-07-10**; the user has pasted this key in chat twice now, consider rotating). Output in `public/img/` (hero-arena, sport-football/hockey/tennis/basketball/racing, sport-crowd, sport-scoreboard, sport-floodlight, cta-celebration). Brand palette: cyan `#38bdf8`, indigo `#818cf8`, orange `#f97316` on `#050a14`. Hero + CTA images were upscaled 2× by the user via Upscayl afterward.
- Older Python/Pillow-generated assets ("Chromatic Velocity") still used for `public/og.png` and the Stripe product image — unrelated to the Ideogram pipeline, don't confuse the two.

### Action-shot refresh + end-frame pairs (2026-07-10, generated but **NOT YET DEPLOYED**)
Replaced the static "ball resting" versions of `sport-football`, `sport-hockey`, `sport-basketball`, `sport-racing` with dynamic action-moment shots (ball mid-strike, puck after a slapshot, ball mid-bounce, car at speed), all at `16x9` instead of the original `3x2` (object-fit:cover on every usage site handles the aspect change fine, no code changes needed). Also added 4 new **end-frame companions** — `sport-football-end`, `sport-hockey-end`, `sport-basketball-end`, `sport-racing-end` — depicting the settled/resolved moment right after the action shot (ball in the net, puck stopped by the goal, ball resting on the court, car receding down the straight), intended as a pair for future motion-graphics work (crossfade/animate between action → end frame). Not wired into any page yet — just sitting in `public/img/`, waiting on a deploy decision.

**Known model quirk worth remembering:** Ideogram has a strong, hard-to-suppress bias toward rendering fake brand text/logos on hockey sticks and hockey pucks specifically, regardless of negative-prompt wording ("no text", "no decals", etc. — all ignored repeatedly). What actually worked: (1) explicitly describing the stick as wrapped end-to-end in matte black hockey tape, and (2) when that still leaked partial text, tightly cropping the composition so only the blade + a few inches of shaft are in frame, with the rest cropped out/blurred/in shadow. `sport-hockey-end` still has a small blurred/cropped text fragment at the frame edge — user explicitly accepted this as good enough, don't re-litigate.

**Another quirk:** for the racing pair, Ideogram defaults to a front-3/4 "hero shot" angle for race cars even when explicitly told to match a side-panning trackside angle — abstract camera-position language ("photographed from a low trackside camera...") was ignored twice. What worked: describing the desired *pixel-level composition* directly ("extreme 90-degree side profile, car's flank fills the frame width, nose pointing to the left edge... like a technical drawing"). Worth remembering as a general prompting lesson for this model, not just for racing.

### Motion-graphic clips via Google Veo 3.1 (2026-07-10, generated but **NOT YET DEPLOYED/WIRED IN**)
Direct Gemini API access (not Vertex, not Higgsfield, not vidIQ) — key in `GOOGLE_AI_STUDIO_API_KEY` env var (also now pasted in chat, same rotation note as Ideogram's key). Pipeline: `design-output/veo-generate.mjs`, same structure as the Ideogram script. Model: `veo-3.1-lite-generate-preview`. Output in `public/video/` (basketball.mp4 at 4s, football/hockey/racing.mp4 at 6s).

**Important limitation:** Veo 3.1's `lastFrame` field (true first+last-frame interpolation, which is what this whole effort was originally going to use the `-end.png` images for) is a real documented API field but **this account's access tier rejects it** ("Your use case is currently not supported" — confirmed by direct testing, not a guess). Plain start-frame image-to-video works fine; the end-frame PNGs are currently only used as *text description* in the prompt, not as a hard target. If `lastFrame` access is ever granted on this key, re-add it to `submitJob()` in the script (the code is already written for it, just commented out with an explanation).

**Duration-vs-drift finding:** at 4s (basketball), the result lands very close to the intended end frame. At 6s (football, hockey, racing), hockey still landed close, but football and racing drifted meaningfully from the intended end state — football's "ball settles in net" became an oversized water-explosion effect obscuring the ball, and racing's locked side-profile camera drifted to a completely different wide/elevated angle by the final frame. **User explicitly accepted both drifted results as-is** — don't regenerate unless asked.

**Practical gotchas from getting this working, worth knowing if scripting against this API again:**
- `durationSeconds` for the lite model only accepts exactly 4, 6, or 8 — not any integer in that range despite the error message wording.
- Downloading the finished video from its `uri` needs the `x-goog-api-key` header (redirects followed); passing the key as a `?key=` query param on the download URL returns a cryptic `{"error":{"code":302,"message":"Unknown Error"}}` JSON body instead of the video bytes.
- REST field names are camelCase (`lastFrame`, `aspectRatio`, `durationSeconds`) even though the Python SDK uses snake_case — confirmed against the actual `python-genai` SDK source on GitHub, not docs (the public docs pages for this were unhelpfully thin/404s at the time).

### 3D landing page prototype — `landing-3d/` (2026-07-11, standalone, NOT deployed)
A separate **Vite + React + TS + Tailwind + Framer Motion** single-page prototype at project root `landing-3d/` (own `package.json`, NOT part of the Next.js app; added to `.dockerignore`/`.gcloudignore` so YFL Cloud Builds ignore it). Adapted from a 3D-creator portfolio template the user supplied, rebuilt in YFL's language. Run: `npm run dev --prefix landing-3d` (port 5199; a `landing-3d` entry exists in `.claude/launch.json` in the Epower12 CWD). Assets are *copies* of `public/img` + `public/video` in `landing-3d/public/`.

Design system: Russo One display + Inter body; "floodlight gradient" headline treatment (`linear-gradient(180deg,#f1f5f9,#7dd3fc 55%,#818cf8)` as `.hero-heading`); gradient pill CTA (`123deg #041322→#0ea5e9→#6366f1→#f97316`, inset glow, white inner outline). Sections: Hero ("CALL THE SCORE" + magnetic basketball-video card, all in normal flow — user rejected the absolute-positioned version that overlapped the CTA), scroll-driven double Marquee of brand imagery, THE GAME (plain copy over full-bleed floodlight image at 16% + vignette — user rejected the char-by-char scroll reveal as "blurry/slow" and images beside text), SCORING (white section; the huge numbers are the real point values +5/+3/+2/0, plus a dark Premium card with €4.99/€49.99, "2 months free yearly", "Secure checkout via Stripe"), MATCHDAY (4 sticky-stacking video cards), footer CTA. **The user reviewed it in their own browser and approved.** Deployment intentionally deferred to a future chat.

**Environment gotcha:** the embedded Browser-pane screenshot tool broke mid-session (every screenshot times out; found the pane viewport had collapsed to 0×0 at one point — resize fixed measurements but not screenshots). Verified layouts via `javascript_tool` computed-style/rect checks + user's own screenshots instead. Also: programmatic `window.scrollTo` in that pane does NOT fire scroll events — dispatch `new Event('scroll')` manually when testing scroll-driven code.

### App-wide design unification (2026-07-11, commit `a1dffd1`, pushed — deploy pending gcloud re-auth)
Carried the landing-3d language into the production Next.js app so landing→app doesn't feel like a site switch:
- `globals.css`: new shared `.hero-heading`, `.btn-pill`, `.btn-pill-ghost` utilities (copies of the landing treatment, documented in a "LANDING DESIGN LANGUAGE" comment block).
- All four auth pages (`login`, `signup`, `forgot-password`, `reset-password`): sport **videos** as full-bleed 22%-opacity backdrops with vignette (`.auth-visual-media`; hockey/football/basketball/racing respectively), Russo One gradient headlines/titles, pill-gradient submit buttons, pill OAuth buttons, uppercase micro-labels (scoped `.auth-form .form-label`).
- **All emoji UI removed** from auth (floating sport icons, 👁️/🙈 toggles → "Show/Hide" text, ⏳/✅/❌ states) and the fabricated "10K+ players / 50+ tournaments / 3 sports" stats block deleted. Password-strength colors moved to brand palette. Dead orb/floating-icon CSS removed.
- App-wide: `.app-page-title` (every in-app page header) and `.app-nav-logo-text` (navbar wordmark) now use Russo One + floodlight gradient.
- NOTE: deploying this also takes the new action-shot images + the 4 videos live (they're in `public/`), so the OLD landing page's sport tiles will show the new action imagery too.

---

## 13. Analytics

- GA4 (`G-77L22ZDCPN`), gated behind Consent Mode v2. No product analytics (PostHog) installed yet — discussed, not built.

---

## 14. Claude Code environment / tooling installed

- everything-claude-code (ECC) + agency-agents installed globally at `~/.claude/`. Not really relevant to day-to-day feature work.

---

## 15. Fixture-fetcher — DONE (2026-07-09), needs owner action to actually track a source

**Discovery that changed the plan:** a fixture-staging pipeline already existed (`lib/api-sports.ts`, `api_leagues`/`api_matches` tables, `/owner` sync UI, `/api/matches/import`) but was built against API-Sports and had **0 rows ever synced** — turned out the account is on API-Sports' **Free plan**, which is hard-capped to seasons **2022–2024 only** (verified live against hockey/football/F1 endpoints; the `next=N` upcoming-fixtures param is also Free-plan-blocked). So the existing pipeline can never fetch current-season data as configured.

**What shipped instead:** generalized the pipeline to be multi-provider and added two free, key-less, current-season sources:
- `lib/nhl.ts` — NHL public API (`api-web.nhle.com`, no key, verified live)
- `lib/jolpicaF1.ts` — Jolpica-F1 (`api.jolpi.ca`, free community Ergast mirror, no key, verified live, includes race results for podium P1/P2/P3)
- `lib/api-sports.ts` generalized to also support Football (still Free-plan-capped to 2022-2024, kept for whenever/if the plan is upgraded)
- `lib/fixtureSync.ts` — shared sync/upsert logic per provider
- `app/api/fixtures/sync` — daily Cloud Scheduler cron (`fixture-sync-daily`, 06:00 UTC, bearer-secret `FIXTURE_SYNC_SECRET`, mirrors `/api/news/refresh`'s pattern), re-syncs every tracked source
- `app/api/matches/import-race` — new route: F1 races are podium picks (P1/P2/P3 driver), not team-vs-team scores, so they stage into a new `api_races` table instead of `api_matches`
- `/owner` sync form and `/manage`'s import tab are now source/provider-aware

**Real bug fixed along the way:** `api_leagues`/`api_matches` were uniquely keyed without scoping by sport — a Hockey and Football (or now API-Sports vs NHL) `external_id` collision would have silently overwritten unrelated synced data the moment a second sport was added. Constraint widened to include `provider`/`sport`; fixed live on Neon plus in `lib/migrations.ts`.

**Explicitly out of scope for this pass (ask before building):**
- Apex Legends — doesn't fit any existing `match_type` (battle-royale placement, not head-to-head or podium-of-3), dropped per user decision.
- Tennis, CS2 — no free API exists; both need a paid vendor (SportRadar, API-Tennis, PandaScore) which means picking a vendor and adding billing. Skipped per user decision.
- football-data.org — needs a free-but-signup API key the user hasn't provided yet. Deferred; NHL + F1 shipped without it.

**What the user still needs to do (session-gated, can't be done by an agent):** log in as owner (`OWNER_EMAIL`), go to `/owner` → API Leagues tab, and use the sync form to actually start tracking an NHL season and an F1 season (e.g. source="NHL", season=2025 for the 2025-26 season; source="Formula 1 — Jolpica", season=2026). Until that happens, `api_leagues` is empty and the daily cron has nothing to re-sync — confirmed via `curl` against the live cron endpoint (`{"leaguesSynced":0}`). Once at least one source is tracked, matches/races land in the staging tables and get imported into a real tournament from `/manage` → Import tab, same flow as before.

---

## 16. Deployment commands (reference)

```bash
GCLOUD="C:/Users/ejatn/AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin/gcloud.cmd"

# Build (from project root, NOT app/)
cd "C:\Users\ejatn\.gemini\antigravity\scratch\sport-predictions"
"$GCLOUD" builds submit --tag gcr.io/project-6b8cb570-b233-4a52-815/sport-predictions .

# Deploy
"$GCLOUD" run deploy sport-predictions \
  --image gcr.io/project-6b8cb570-b233-4a52-815/sport-predictions \
  --platform managed --region us-central1 --allow-unauthenticated

# Update env vars (example)
"$GCLOUD" run services update sport-predictions --region us-central1 \
  --update-env-vars "KEY1=value1,KEY2=value2"

# Read logs
"$GCLOUD" run services logs read sport-predictions --region us-central1 --limit 50
```

**Known friction:** `gcloud` auth expires periodically — if a command fails with an auth error, ask the user to run `gcloud auth login`.

**Known friction #2 (Windows):** invoke gcloud via PowerShell with the `&` call-operator syntax and everything on ONE line — bash-style `\` line continuations break PowerShell's parser, and Git Bash sometimes fails to resolve backslash paths.

---

## 17. Key file map

```
app/                              # git repo root (github.com/Epower12/app)
├── layout.tsx / providers.tsx / page.tsx
├── landing/page.tsx              # marketing landing — now uses Ideogram imagery (§12)
├── news/page.tsx | blog/**
├── legal|terms|privacy/page.tsx
├── profile/page.tsx
├── login/page.tsx | signup/page.tsx    # NextAuth credentials + OAuth (§21), honor ?next= redirect
├── components/
│   ├── Navbar.tsx                # hardcoded links: /, /tournaments, /profile, (/premium)
│   ├── OAuthButtons.tsx          # NEW — getProviders()-gated, renders only configured providers
│   ├── CookieConsent.tsx | GoogleAnalytics.tsx | LegalPageLayout.tsx | ContentPageShell.tsx
│   └── OrganizationJsonLd.tsx | SoftwareApplicationJsonLd.tsx | BreadcrumbJsonLd.tsx
├── manage/[tournamentId]/page.tsx
├── teams/**                      # NEW — Team Management Platform Phase 1, see §22
│   ├── page.tsx | new/page.tsx | admin/page.tsx
│   └── [teamId]/page.tsx | [teamId]/roster/page.tsx
└── api/
    ├── auth/[...nextauth]/route.ts   # authOptions — credentials + conditional Google/Discord
    ├── stripe/**, news/refresh/route.ts, user/profile/delete/route.ts
    └── teams/**                  # NEW — see §22

lib/                               # project root, NOT git-tracked (see §2 quirk)
├── db.ts                # pg Pool, tuned timeouts
├── migrations.ts         # ensureMigrations() — idempotent, called from API routes, appends grow over time
├── email.ts | stripe.ts | rateLimit.ts | news.ts | rssSources.ts | blog.ts | presets.ts
├── countryFlags.ts | sportsdb.ts
├── types.ts | scoring.ts          # multi-format league types + scoring dispatcher
├── appleClientSecret.ts           # NEW — unused (Apple OAuth not set up), ES256 JWT builder if ever needed
└── teamPlatform/                  # NEW — see §22
    ├── types.ts | permissions.ts (+.test.ts) | getAuthContext.ts (+.test.ts)

proxy.ts                  # host-routing + security headers + auth gate (untracked, project root)
next.config.ts             # untracked, project root
vitest.config.ts            # NEW — untracked, project root; Vitest introduced for lib/teamPlatform only
design-output/               # Ideogram + legacy Pillow brand asset generators
```

---

## 18. Things to NOT redo (already resolved, don't re-litigate)

- Domain naming: root = `yourfriendleague.com` (no "s"), brand = "YourFriendsLeague" (with "s"). Intentional.
- `middleware.ts` → `proxy.ts` with exported `proxy()`. Next.js 16 convention, not a mistake.
- ESPN RSS feeds are permanently broken.
- Whalebone SSL warning is a false-positive ISP block, already diagnosed, delisting request sent.
- `simulate_payment` exploit already removed.
- Only `app/` is git-tracked; `lib/` etc. are not (§2) — this is intentional/inherited, not something to "fix."

---

## 19. Multi-format leagues — F1 / Esports / Tennis (DEPLOYED)

Previously pending, **now built, committed, and deployed**. Three match types via `match_type` on `matches` (default `'score'`).

- **`score`** — unchanged, tiered 5/3/2/0 scoring.
- **`series`** — esports (CS2/LoL/Dota2/Valorant) + tennis, `series_format` BO1/BO3/BO5, pill-button UI (`SeriesPredictor.tsx`), reuses `predictions` table.
- **`race`** — F1/MotoGP podium picks, `race_session` (qualifying/sprint_qualifying/sprint/race), new `race_drivers`/`race_predictions` tables, `RacePredictor.tsx`, scoring in `lib/scoring.ts`.

New files: `lib/migrations.ts` (the idempotent auto-migration pattern all later features reused), `app/api/race-drivers/route.ts`, `app/api/race-predictions/route.ts`, plus updates to matches/leaderboard API and predictions/leaderboard/manage pages.

**Known-fixed gotcha:** `race_drivers`/`race_predictions` were originally defined with `TEXT` foreign keys against `uuid` columns (`tournaments.id`, `users.id`, `matches.id`) — silently failed to create via `CREATE TABLE IF NOT EXISTS ... .catch(() => {})`. Fixed to `UUID` and re-applied directly to Neon. If you ever see this pattern elsewhere, check types match before assuming `.catch(() => {})` succeeded.

---

## 20. OAuth login — Google + Discord (DEPLOYED, LIVE)

- `app/api/auth/[...nextauth]/route.ts` rewritten: providers register **conditionally** (only once both `<PROVIDER>_CLIENT_ID`/`_CLIENT_SECRET` env vars exist), so credentials auth never breaks even with zero OAuth configured.
- **Currently live:** Google and Discord (env vars set on Cloud Run, confirmed working end-to-end).
- **Coded but not activated:** Facebook, Apple — user explicitly chose not to set these up. Apple needs `lib/appleClientSecret.ts` (builds a signed ES256 JWT client secret from `APPLE_TEAM_ID`/`APPLE_KEY_ID`/`APPLE_PRIVATE_KEY`, since NextAuth's Apple provider wants a JWT, not raw credentials) if ever revisited.
- First-time OAuth sign-in auto-creates a `users` row: nullable `password` (migrated, was `NOT NULL`), new `oauth_provider` column tracks source. Returning users link by email.
- `app/components/OAuthButtons.tsx` — calls `getProviders()`, only renders buttons for providers actually configured server-side. Used on both `/login` and `/signup`.
- **⚠️ Just-fixed bug (commit `eaf58ae`, pushed, NOT yet deployed as of this handoff):** `/login` and `/signup` previously ignored any `?next=` query param — credentials login always did `router.push('/')`, and `OAuthButtons callbackUrl` was hardcoded to `/`. Both pages now read `next` via `useSearchParams()` and honor it for both credentials and OAuth paths, including forwarding it across the login↔signup cross-links. **If resuming this thread, check whether this commit has been deployed yet — if not, deploy it before testing anything that redirects to `/login?next=...`.**

---

## 21. Team Management Platform — REMOVED (2026-07-09)

The entire feature described below was **deleted** on 2026-07-09: `/teams/**` and `/api/teams/**` routes removed from the `app/` repo (commit `77ad6be`, pushed to `origin/main`, built and deployed to Cloud Run — `/teams` now 404s live), `lib/teamPlatform/**` deleted (untracked, project root), the team-platform migration block removed from `lib/migrations.ts`, and the `teams`/`players`/`team_members` tables dropped from Neon (each held only 1 leftover test row, not real data). `vitest.config.ts` was left in place even though its only test suite (`teamPlatform`) is gone — harmless, reusable if tests are added elsewhere. The historical spec/plan docs under `app/docs/superpowers/specs|plans/2026-07-05-team-management-*` were left untouched as an archival record; nothing in the live app references them.

The section below is kept for historical reference only — **do not treat it as current state.**

### (Historical) Team Management Platform — Phase 1

A second product bolted onto the same YFL app/deployment/database — multi-tenant team-operations tool (roster, [later: schedule/RSVP/attendance/finances]) for real sports teams, not the prediction game. Full design spec: `app/docs/superpowers/specs/2026-07-05-team-management-platform-design.md`. Phase 1 plan: `app/docs/superpowers/plans/2026-07-05-team-management-phase1.md`.

### Architecture decisions (already made, don't re-litigate)
- **Shares YFL's auth** (same `users` table, same login) but role/permission logic is **completely separate** from YFL's own `role`/`is_paid`.
- **No new `users` table.** Team-platform super-admin = YFL's existing `role === 'admin'`. No separate admin flag.
- New tables: `teams`, `players`, `team_members` (role: coach/manager/player). Schema + migrations in `lib/migrations.ts`, indexes verified live on Neon.
- Permission logic: `lib/teamPlatform/permissions.ts` (pure functions: `canViewTeam`, `canManageRoster`, `canDeleteTeam`) + `lib/teamPlatform/getAuthContext.ts` (DB lookup wrapper) — both unit-tested with Vitest (12 tests total, first test suite this codebase has ever had).
- API: `app/api/teams/**` — full CRUD for teams + roster, every route enforces auth server-side (session → `getAuthContext` → permission check), matches this codebase's existing route conventions (camelCase request bodies, raw snake_case DB rows in responses, parameterized SQL throughout).
- Pages: `app/teams/**` — list/create/admin/dashboard/roster. **Hidden from YFL's main nav on purpose** — reachable only by direct URL or (later) invite link.
- Built via subagent-driven-development on a `team-management-phase1` branch (since only `app/` is git-tracked — see §2 — the branch only isolated the `app/` portion; `lib/` changes and the live DB migration applied directly, same as always). Whole-branch review: **Ready to merge, no Critical/Important issues.** Merged, deployed.

### Explicitly deferred from Phase 1 (now being reconsidered — see below)
- Invite links (player self-registration flow) — deferred to whenever RSVP/attendance lands, since manual roster entry covers Phase 1.
- Schedule, RSVP, Attendance, Finances (dues + expenses) — these were Phases 2/3/5 in the original spec's build order.
- EHL roster import (paste a team URL from `ehl.entuziasti.com`, scrape roster, preview, confirm) — Phase 1's own build order had this as "can land any time, not blocking," selectors "need confirming against a real page."

### Current state: mid-conversation, NOT resolved yet
The user saw the live Phase 1 UI and pushed back hard: **"it seems like elementary schools work"** — the deliberate "no UI polish" Phase 1 scope (plain `.btn`/`.input` classes, no imagery, no visual identity) undershot expectations once actually seen live. They bundled several asks together in one message, which have since been decomposed and partially addressed:

1. **✅ DONE (commit `eaf58ae`, pushed, not yet deployed):** the `?next=` redirect bug (§20).
2. **🔴 NOT STARTED — the big one:** Visual redesign of all `/teams/**` pages to match YFL's actual design quality bar (not the placeholder styling). Recommended direction (not yet confirmed by user): reuse YFL's established color palette/typography (cyan `#38bdf8`/indigo `#818cf8`, dark `#050a14` background, Russo One headings) for brand consistency, but lean toward a **functional dashboard aesthetic** rather than marketing-page flourishes, since coaches/managers will use this repeatedly as a tool, not admire it once like a landing page.
3. **🔴 NOT STARTED, bundled with #2:** a **team-context sub-navigation ribbon**. User's own words: "if we have teams page then the top ribbon should have the pages related to it. At the moment it hasn't." Confirmed via follow-ups: the sub-nav's tab list should include **Dashboard, Roster, Attendance, Finances** (matches the original spec's module list — Schedule wasn't explicitly named but is implied). Open design question never resolved: does this REPLACE `Navbar.tsx`'s standard link set (Home/Tournaments/Profile) only when inside `/teams/[teamId]/**`, keeping logo/sign-out/notifications consistent? (This is the working assumption, not yet confirmed.) Also unresolved: should tabs for not-yet-built sections (Schedule/Attendance/Finances) show as disabled/"coming soon," or be hidden until built?
4. **🔴 NOT STARTED — real feature, pulled forward from deferred status:** EHL roster import. **The user gave a real URL to inspect:** `https://ehl.entuziasti.com/komandas/vhr-thunder/505`. Already fetched and its real HTML structure documented — **reuse this, don't re-fetch unless the site changed**:
   - Roster tables: `<table class="team-players-list" id="team-players-list">` (skaters), `id="team-goalies-list">` (goalies).
   - Rows: `<tr class="player-row">` with cells in order: jersey number (as `<a>` text, links to `/personas/{slug}/{id1}/{id2}`), full name (`<td class="icons-cell name">`, single "Firstname Lastname" string — sometimes 3 words, e.g. "Artūrs Harijs Jansons" — needs a split heuristic + human preview/edit, not perfect automated parsing), position code (`U`=forward/uzbrucējs, `A`=defenseman/aizsargs, presumably `V`=goalie for the goalies table), then GP/G/A/P/PIM stat columns (ignore these — original spec explicitly wants "just basic info: name, position, photo — no game stats").
   - **No player photos anywhere in the roster table** — only on each player's individual `/personas/...` profile page. Fetching a photo per player means one extra HTTP request per player; recommend **skipping photo import for a first version** given the spec's own minimalism ("just basic info").
   - Original spec's UX: paste URL → server fetches+parses → show a **preview list for the coach to confirm/edit** before saving to `players` — this naturally absorbs the name-splitting ambiguity via human review rather than needing perfect parsing.
5. **🔴 NOT STARTED — pulled forward from Phase 5:** Finances (dues + expenses). No design work done yet at all.

**Agreed build order (explicitly confirmed by user):** bug fix (done) → visual redesign + sub-nav (as one combined design) → EHL import → Finances.

**Process state:** was actively brainstorming the visual redesign + sub-nav using the `superpowers:brainstorming` skill. User accepted the offer to use the **visual companion** (browser-based mockup tool) for this — a `start-server.sh` launch was located (`.claude/plugins/cache/claude-plugins-official/superpowers/6.0.2/skills/brainstorming/scripts/start-server.sh`) but **the server was never actually started** before the conversation was interrupted for this handoff. If resuming: either launch that visual companion server (`--project-dir` should be the project root; Windows needs `run_in_background: true` per the skill's own guidance) and continue the visual style-direction question there, or just proceed with terminal-only brainstorming if the tool feels like overhead.

**No design doc has been written for any of items 2-5 yet** — brainstorming was still in the requirements-gathering phase (options/approaches hadn't been proposed yet) when interrupted.

### Dev/testing notes specific to this module
- No seeded test accounts exist in the live/dev DB. Verification this session repeatedly created **throwaway test users directly via SQL** (bcrypt-hashed password, `INSERT INTO users`), exercised the flow, then deleted them (`DELETE FROM users WHERE email = ...`) plus any team/player rows they created (`teams` cascades to `team_members`/`players` via `ON DELETE CASCADE`). Follow the same pattern for further manual testing — don't leave test accounts behind in production data.
- The dev server (`npm run dev` on port 3477, via the Claude Preview MCP tool, `.claude/launch.json` config name `yfl-dev`) accumulates a LOT of session/cookie state over a long session and Turbopack's first-compile-per-route can take 1-2+ seconds after heavy HMR churn from live edits — if a login/test flow seems to silently fail, check the **server-side terminal log** (not just client network calls) before assuming a real bug; a `POST .../callback/credentials 200` followed by the expected redirect in the server log is the ground truth, client-side `fetch('/api/auth/session')` checks can race ahead of a slow cold-compile and look like a failure when it actually succeeded a moment later. When in doubt, stop and restart the preview server fresh.

---

## 22. Suggested first message in the new chat

> "Continuing work on YourFriendsLeague (see HANDOFF.md I just pasted). The Team Management Platform was removed (§21) — [state your next priority here]."
