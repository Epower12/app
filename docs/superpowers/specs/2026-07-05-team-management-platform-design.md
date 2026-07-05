# Team Management Platform — Design

Source spec: `C:\Users\ejatn\Downloads\CLAUDE_CODE_SPEC.md` (Latvian original). This document adapts that spec to live inside the existing YourFriendsLeague (YFL) codebase and reconciles it with YFL's existing auth system. Where this doc is silent on a detail, the original spec's SQL/API/page definitions apply unchanged.

## 1. Purpose & relationship to YFL

A multi-tenant team-operations tool (roster, schedule, RSVP, attendance, lines/shifts, finances) for real sports teams/clubs — not limited to hockey (`sport_type` per team). Free, no billing. Multiple clubs onboard from day one; teams are already identified, no hard deadline.

**Architecture decision:** built into the existing YFL Next.js app/repo (`app/` at this project root), sharing its Cloud Run deployment, its Neon database, and its NextAuth authentication (credentials + Google + Discord). It is **not** a separate service and does not get its own subdomain. Everything other than authentication — roles, permissions, data — is a completely separate concern from YFL's own prediction-game logic.

**Navigation:** hidden/separate. No link in YFL's marketing nav or main app navbar. Reached only via a direct URL (`/teams`) or an invite link. UI language: English (the original spec and sample data are Latvian, but the built product's copy is English; player names/data are whatever users enter).

## 2. Data model

All new tables live in the same Neon database as YFL's existing schema (`tournaments`, `matches`, `users`, etc.) and are added via the existing `lib/migrations.ts` idempotent-migration pattern (`CREATE TABLE IF NOT EXISTS`, guarded `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).

**No new `users` table.** Every reference to a person uses YFL's existing `users(id)` (uuid). The original spec's `users` table (with `password_hash`, `is_super_admin`) is dropped entirely — auth identity is YFL's problem.

**Super-admin of this platform = YFL's existing `role = 'admin'`.** No separate marker table. A super-admin check is simply `session.user.role === 'admin'`.

```sql
-- ==== TEAMS ====
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport_type text not null default 'hockey',
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- ==== TEAM MEMBERS (role per team) ====
create table team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  role text not null check (role in ('coach','manager','player')),
  player_id uuid references players(id),
  created_at timestamptz default now(),
  unique(user_id, team_id)
);

-- ==== PLAYERS (roster entry — may exist without a user_id) ====
create table players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  position text,
  jersey_number int,
  phone text,
  dues_monthly numeric(10,2) default 0,
  photo_url text,
  ehl_profile_url text,
  user_id uuid references users(id),
  created_at timestamptz default now()
);

-- ==== INVITE LINKS ====
create table invite_links (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  role text not null default 'player',
  player_id uuid references players(id),
  token text unique not null,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz default now()
);

-- ==== WEEKLY SCHEDULE PATTERN ====
create table schedule_pattern (
  team_id uuid primary key references teams(id) on delete cascade,
  practice_days int[] not null default '{1,3,5}', -- 0=Sun ... 6=Sat
  physical_days int[] not null default '{4}'
);

-- ==== EVENTS (practice + physical + games, one table) ====
create table events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  type text not null check (type in ('practice','physical','game')),
  date date not null,
  time time,
  opponent text,
  location text,
  home_away text check (home_away in ('home','away')),
  notes text,
  created_at timestamptz default now(),
  unique(team_id, type, date)
);

-- ==== RSVP ====
create table rsvp (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  status text not null check (status in ('coming','not_coming','maybe')),
  responded_at timestamptz default now(),
  unique(event_id, player_id)
);

-- ==== ATTENDANCE (actual, marked by coach after the fact) ====
create table attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  present boolean not null default false,
  marked_by uuid references users(id),
  marked_at timestamptz default now(),
  unique(event_id, player_id)
);

-- ==== LINES / SHIFTS ====
create table line_groups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  name text not null,
  sort_order int default 0
);

create table line_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id), -- NULL = default template
  line_group_id uuid references line_groups(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  unique(event_id, line_group_id, player_id)
);

-- ==== FINANCES ====
create table dues (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  month_key text not null, -- '2026-08'
  paid boolean not null default false,
  paid_at timestamptz,
  unique(player_id, month_key)
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  date date not null,
  category text not null,
  amount numeric(10,2) not null,
  note text,
  created_by uuid references users(id),
  created_at timestamptz default now()
);
```

**Events are lazily materialized:** practice/physical events are not pre-generated for the whole season. They're inserted into `events` the first time a coach/manager opens a given month in the schedule view, based on `schedule_pattern`. Prevents years of empty rows and lets the weekly pattern change later without rewriting history.

## 3. Roles & permissions

| Role | Scope | Rights |
|---|---|---|
| Super-admin (`users.role = 'admin'`) | Whole platform | Create/delete any team, see everything |
| `coach` | One team | Roster (for game purposes), lines/shifts, sees RSVP, marks actual attendance, can create a new team |
| `manager` | One team | Finances, schedule/logistics, roster admin, can create a new team |
| `player` | Own team, own data | RSVP per event, sees own attendance + dues status, sees team schedule |

One `team_members` row per `(user_id, team_id)` — a person has exactly one role on a given team in this MVP (schema allows extending to multiple roles per team later without a painful migration, per original spec's note, but that's explicitly out of scope now).

Every API route: `getServerSession` → allow if `session.user.role === 'admin'`, OR a `team_members` row exists for `(session.user.id, :teamId)` with a role that permits the action. No Postgres RLS — enforced in the API route/handler, consistent with the original spec's reasoning (Neon has no Supabase-style RLS-by-JWT).

## 4. Auth & invite flow

No separate password-creation step anywhere in this module — a person always already has (or creates via YFL's existing signup: credentials, Google, or Discord) one YFL account before touching any team.

**Self-serve team creation:** any authenticated YFL user can visit `/teams/new`, name a team, pick a sport and initial role (`coach` or `manager`), and get a `teams` row + `team_members` row instantly. Not logged in → redirected to YFL login/signup with a `?next=/teams/new` param, same redirect-preservation pattern already used for the premium-checkout flow (`app/signup/page.tsx`'s `intent`/`plan` handling).

**Player invite links:** a coach/manager generates an `invite_links` token, optionally pre-attached to a specific `players` roster row, and shares it externally. Visiting `/teams/invite/[token]`:
1. If not logged in, redirect to login/signup with the invite path preserved via `?next=`.
2. Once authenticated, show an accept screen. Accepting creates a `team_members` row (`role: 'player'`), linked either to the invite's pre-specified `player_id`, or — if none was specified — after the user fills in basic roster fields (name, position, jersey number), which creates a new `players` row.

**Manual roster entry:** a coach/manager can still add a `players` row directly with no `user_id` (name/position/number/phone only). That person can't log in to see their own RSVP/attendance until an invite link connects a real account to that roster row later.

## 5. Routes

```
/teams                      — team list (yours) or prompt to create/enter invite
/teams/new                  — self-serve create-a-team
/teams/invite/[token]       — invite acceptance
/teams/admin                — super-admin: all-teams list
/teams/admin/[teamId]       — super-admin: manage any team
/teams/[teamId]             — role-based dashboard
/teams/[teamId]/roster      — coach, manager
/teams/[teamId]/schedule    — coach, manager, player (read-only)
/teams/[teamId]/attendance  — coach (marks), manager/player (view)
/teams/[teamId]/rsvp        — player (self), coach/manager (summary)
/teams/[teamId]/lines       — coach (edit), manager/player (view)
/teams/[teamId]/finances    — manager (edit), coach (view), player (own dues only)
```

API routes mirror the same shape under `/api/teams/...` per the original spec's section 6 (adjusted paths: `POST /api/teams`, `GET /api/teams/:id`, `POST /api/teams/:id/invite`, `POST /api/teams/invite/:token/accept`, `GET|POST /api/teams/:id/players`, `POST /api/teams/:id/players/import-ehl` + `/import-ehl/confirm`, `GET|PUT /api/teams/:id/schedule-pattern`, `GET|POST /api/teams/:id/events`, `POST|GET /api/teams/events/:id/rsvp`, `POST /api/teams/events/:id/attendance`, `GET|POST /api/teams/:id/line-groups`, `PUT /api/teams/events/:id/line-assignments`, `GET|POST /api/teams/:id/finances/dues`, `GET|POST /api/teams/:id/finances/expenses`).

All of these fall under `proxy.ts`'s existing "every `/api/*` route requires a valid session" gate automatically — no proxy.ts changes needed. Per-route authorization (role/team checks) happens inside each handler, as described in section 3.

## 6. File organization

- `lib/teamPlatform/` — new domain logic (migrations appended to existing `lib/migrations.ts`; attendance %, dues/budget calculations, and permission-check helpers as their own small modules)
- `app/teams/**` — pages
- `app/api/teams/**` — API routes
- Nothing in the existing YFL codebase gets restructured to make room for this.

## 7. Build order

1. Teams + team_members + players (core CRUD, no UI polish) — reuses existing auth, no new auth work needed
2. Schedule pattern + event materialization + games
3. RSVP + attendance together (their data is cross-referenced in the UI)
4. Lines/shifts
5. Finances (dues + expenses + budget summary)
6. EHL import (can land any time after step 1 — not blocking)

## 8. Testing strategy

Vitest is introduced for this module (the rest of YFL currently has no automated test suite — verified via typecheck + build + manual preview only; this module gets real coverage because it has real business logic worth protecting). Unit tests target:
- Attendance % calculation (practice vs. physical, per month)
- Dues/expense budget math (income vs. spend, per month, net)
- RSVP-vs-attendance reconciliation logic (pre-fill attendance from RSVP, allow override)
- Role/permission checks (who can do what, per role, per team) — these are security-relevant and should be tested first
- Event materialization from `schedule_pattern` (correct weekdays generated for a given month, idempotent re-open)

Integration-level coverage for the API routes' auth/permission gating is the second priority. Full E2E is not in scope for the initial build.

## 9. Out of scope / deferred

- **EHL import selectors**: the original spec already flags that exact CSS/HTML selectors need to be confirmed against a real `ehl.entuziasti.com` team page during implementation — not solved in this design.
- **Billing/Stripe**: not needed, confirmed free product.
- **i18n / bilingual UI**: not needed, English-only confirmed.
- **Multiple roles per team per user, or one user across many teams with different roles**: schema supports it later (per original spec's note) but not built now — one `team_members` row per `(user_id, team_id)`.
- **Team-platform super-admin as a distinct set of people from YFL's `role='admin'`**: not needed — they're defined as the same people.

## 10. Decisions log

- Multi-tenant from day one; teams already identified but no hard deadline.
- Free product, no billing planned.
- Same infra pattern as YFL: Neon + Google Cloud Run — but built into the existing app/deployment rather than a separate service, reusing `yourfriendleague.com`'s ecosystem without a new domain or subdomain.
- Shared authentication with YFL (same account, same login), but all roles/permissions/data are a fully separate concern from YFL's own `role`/`is_paid`.
- Super-admin of this platform = YFL's existing `role = 'admin'` — no separate admin flag.
- Hidden from YFL's main navigation; reached only via direct URL or invite link.
- English-only UI.
- Vitest introduced specifically for this module's business logic and permission checks.
- (Carried from original spec) EHL import is a one-time import, not ongoing sync; RSVP and actual attendance are two separate datasets, both retained; lines/shifts are a universal (non-hockey-specific) concept; manager = admin/finance side, coach = sport side, both can create a new team.
