# Team Management Platform — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build core CRUD for teams, team memberships, and roster (players) inside the existing YourFriendsLeague (YFL) Next.js app, reusing its auth system, with no UI polish and no invite-link flow yet (deferred to Phase 3, when players first need real accounts for RSVP).

**Architecture:** New tables (`teams`, `players`, `team_members`) added to YFL's existing Neon database via the existing `lib/migrations.ts` pattern. All person references point at YFL's existing `users(id)` — no new user table. Permission checks are pure, independently unit-tested functions fed by a small DB-touching context builder. API routes live under `app/api/teams/**`, pages under `app/teams/**`, both new to this codebase and additive only.

**Tech Stack:** Next.js 16 App Router, TypeScript, `pg` (node-postgres), NextAuth v4 (existing `authOptions`), Vitest (new to this codebase, introduced in Task 1).

Full design context: `docs/superpowers/specs/2026-07-05-team-management-platform-design.md`.

## Global Constraints

- No new `users` table — every person reference is `users(id)` (uuid), reusing YFL's existing auth.
- Team-platform super-admin = `session.user.role === 'admin'` on YFL's existing session — no separate admin flag or table.
- English-only UI. No billing/Stripe. No i18n.
- No `proxy.ts` changes — its existing "every `/api/*` requires a session" gate already covers every new route; per-route role/team authorization happens inside each handler.
- Path alias `@/*` maps to the project root (`tsconfig.json`) — use `@/lib/...`, `@/app/...` imports in all new files.
- `lib/migrations.ts` convention: idempotent `CREATE TABLE IF NOT EXISTS` / guarded `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, each statement wrapped in `.catch(() => {})`. New tables must be created in FK-safe order: `teams` → `players` → `team_members`.
- `node-postgres` returns `NUMERIC` columns as strings, not numbers — reflected in this plan's TypeScript types (`dues_monthly: string`).
- Every new API route calls `await ensureMigrations();` before querying, matching the existing defensive pattern (protects against Cloud Run cold-starts hitting routes in arbitrary order).
- Vitest is introduced specifically for this module's permission/business logic (pure functions, DB access mocked). API routes and pages are verified via `npm run build` + manual preview, matching how the rest of this codebase (which has no test suite at all) has always been verified.
- Nothing in the existing YFL codebase gets restructured or renamed to make room for this.

---

## File Structure

```
lib/teamPlatform/
  types.ts                    NEW — Team, TeamMember, Player, TeamRole types
  permissions.ts               NEW — pure permission-check functions (unit tested)
  permissions.test.ts           NEW — Vitest tests for permissions.ts
  getAuthContext.ts             NEW — builds an AuthContext from a DB lookup (unit tested, DB mocked)
  getAuthContext.test.ts        NEW — Vitest tests for getAuthContext.ts

lib/migrations.ts               MODIFY — append teams/players/team_members table creation

app/api/teams/
  route.ts                     NEW — GET (list my teams), POST (create team)
  admin/route.ts                NEW — GET (super-admin: all teams)
  [teamId]/route.ts             NEW — GET (team detail), DELETE (super-admin only)
  [teamId]/players/route.ts     NEW — GET (roster list), POST (add player)
  [teamId]/players/[playerId]/route.ts  NEW — PATCH (edit player), DELETE (remove player)

app/teams/
  page.tsx                     NEW — your teams list + links to create/admin
  new/page.tsx                  NEW — create-a-team form
  admin/page.tsx                 NEW — super-admin: all-teams list
  [teamId]/page.tsx              NEW — team dashboard shell
  [teamId]/roster/page.tsx        NEW — roster view + add/remove (coach/manager/admin)

vitest.config.ts                NEW — Vitest config (node environment)
package.json                    MODIFY — add "test"/"test:watch" scripts + vitest devDependency
```

---

## Task 1: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/teamPlatform/smoke.test.ts` (temporary — deleted in Task 3 once real tests exist)
- Modify: `package.json`

**Interfaces:**
- Produces: `npm test` / `npm run test:watch` commands available for every later task.

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`
Expected: `vitest` appears under `devDependencies` in `package.json`.

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['lib/**/*.test.ts'],
    },
});
```

- [ ] **Step 3: Add test scripts to package.json**

In `package.json`, inside `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a trivial smoke test**

Create `lib/teamPlatform/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest smoke test', () => {
    it('runs', () => {
        expect(1 + 1).toBe(2);
    });
});
```

- [ ] **Step 5: Run it and confirm the harness works**

Run: `npm test`
Expected: `1 passed` (the smoke test), exit code 0.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json lib/teamPlatform/smoke.test.ts
git commit -m "chore: add Vitest for the team-management module"
```

---

## Task 2: Database schema — teams, players, team_members

**Files:**
- Modify: `lib/migrations.ts`
- Create: `lib/teamPlatform/types.ts`

**Interfaces:**
- Produces: `Team`, `TeamMember`, `Player`, `TeamRole` types, imported by every later task. Tables `teams`, `players`, `team_members` exist in Neon after this task runs against a real database.

- [ ] **Step 1: Append the new tables to `lib/migrations.ts`**

Modify `lib/migrations.ts` — inside `runMigrations()`, right before the closing `}` of the function (after the existing OAuth lines), add:

```ts
    // ==== Team management platform ====
    // Order matters: teams has no deps, players depends on teams,
    // team_members depends on both teams and players.
    await db.query(`
        CREATE TABLE IF NOT EXISTS teams (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            sport_type TEXT NOT NULL DEFAULT 'hockey',
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `).catch(() => {});

    await db.query(`
        CREATE TABLE IF NOT EXISTS players (
            id UUID PRIMARY KEY,
            team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            position TEXT,
            jersey_number INTEGER,
            phone TEXT,
            dues_monthly NUMERIC(10,2) DEFAULT 0,
            photo_url TEXT,
            ehl_profile_url TEXT,
            user_id UUID REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `).catch(() => {});
    await db.query(`CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id)`).catch(() => {});

    await db.query(`
        CREATE TABLE IF NOT EXISTS team_members (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK (role IN ('coach','manager','player')),
            player_id UUID REFERENCES players(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, team_id)
        )
    `).catch(() => {});
    await db.query(`CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)`).catch(() => {});
    await db.query(`CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id)`).catch(() => {});
```

- [ ] **Step 2: Create the TypeScript types**

Create `lib/teamPlatform/types.ts`:

```ts
export type TeamRole = 'coach' | 'manager' | 'player';

export interface Team {
    id: string;
    name: string;
    sport_type: string;
    created_by: string | null;
    created_at: string;
}

export interface TeamMember {
    id: string;
    user_id: string;
    team_id: string;
    role: TeamRole;
    player_id: string | null;
    created_at: string;
}

export interface Player {
    id: string;
    team_id: string;
    first_name: string;
    last_name: string;
    position: string | null;
    jersey_number: number | null;
    phone: string | null;
    // node-postgres returns NUMERIC columns as strings to avoid float precision loss.
    dues_monthly: string;
    photo_url: string | null;
    ehl_profile_url: string | null;
    user_id: string | null;
    created_at: string;
}
```

- [ ] **Step 3: Verify the migration runs against Neon**

This isn't a Vitest test — it's a schema change verified directly against the database, same as every other migration in this codebase. Create a temporary script `_verify-teams-migration.mjs` at the project root:

```js
import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function tableExists(name) {
    const { rows } = await pool.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name=$1)`,
        [name]
    );
    return rows[0].exists;
}

// Inline copy of the migration statements from lib/migrations.ts — run once to prove they work.
await pool.query(`CREATE TABLE IF NOT EXISTS teams (id UUID PRIMARY KEY, name TEXT NOT NULL, sport_type TEXT NOT NULL DEFAULT 'hockey', created_by UUID REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW())`);
await pool.query(`CREATE TABLE IF NOT EXISTS players (id UUID PRIMARY KEY, team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE, first_name TEXT NOT NULL, last_name TEXT NOT NULL, position TEXT, jersey_number INTEGER, phone TEXT, dues_monthly NUMERIC(10,2) DEFAULT 0, photo_url TEXT, ehl_profile_url TEXT, user_id UUID REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW())`);
await pool.query(`CREATE TABLE IF NOT EXISTS team_members (id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE, role TEXT NOT NULL CHECK (role IN ('coach','manager','player')), player_id UUID REFERENCES players(id), created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, team_id))`);

console.log('teams:', await tableExists('teams'));
console.log('players:', await tableExists('players'));
console.log('team_members:', await tableExists('team_members'));

await pool.end();
```

Run: `node _verify-teams-migration.mjs`
Expected output: `teams: true`, `players: true`, `team_members: true`

Then delete the temporary script: `rm _verify-teams-migration.mjs`

- [ ] **Step 4: Commit**

```bash
git add lib/migrations.ts lib/teamPlatform/types.ts
git commit -m "feat: add teams, players, team_members tables"
```

---

## Task 3: Permission helper functions (TDD)

**Files:**
- Create: `lib/teamPlatform/permissions.ts`
- Test: `lib/teamPlatform/permissions.test.ts`
- Delete: `lib/teamPlatform/smoke.test.ts` (no longer needed — real tests now exist)

**Interfaces:**
- Consumes: `TeamRole` from `lib/teamPlatform/types.ts` (Task 2).
- Produces: `AuthContext` type, `canViewTeam(ctx)`, `canManageRoster(ctx)`, `canDeleteTeam(ctx)` — all pure functions, consumed by Task 4 and every API route task.

- [ ] **Step 1: Write the failing tests**

Create `lib/teamPlatform/permissions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canViewTeam, canManageRoster, canDeleteTeam } from './permissions';

describe('canViewTeam', () => {
    it('allows a super-admin with no membership', () => {
        expect(canViewTeam({ isSuperAdmin: true, membership: null })).toBe(true);
    });
    it('allows any team member regardless of role', () => {
        expect(canViewTeam({ isSuperAdmin: false, membership: { role: 'player' } })).toBe(true);
    });
    it('denies a non-member non-admin', () => {
        expect(canViewTeam({ isSuperAdmin: false, membership: null })).toBe(false);
    });
});

describe('canManageRoster', () => {
    it('allows a coach', () => {
        expect(canManageRoster({ isSuperAdmin: false, membership: { role: 'coach' } })).toBe(true);
    });
    it('allows a manager', () => {
        expect(canManageRoster({ isSuperAdmin: false, membership: { role: 'manager' } })).toBe(true);
    });
    it('denies a player', () => {
        expect(canManageRoster({ isSuperAdmin: false, membership: { role: 'player' } })).toBe(false);
    });
    it('allows a super-admin even with no membership', () => {
        expect(canManageRoster({ isSuperAdmin: true, membership: null })).toBe(true);
    });
});

describe('canDeleteTeam', () => {
    it('allows a super-admin', () => {
        expect(canDeleteTeam({ isSuperAdmin: true, membership: null })).toBe(true);
    });
    it('denies a coach', () => {
        expect(canDeleteTeam({ isSuperAdmin: false, membership: { role: 'coach' } })).toBe(false);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './permissions'` (file doesn't exist yet).

- [ ] **Step 3: Implement the permission functions**

Create `lib/teamPlatform/permissions.ts`:

```ts
import type { TeamRole } from './types';

export interface AuthContext {
    isSuperAdmin: boolean;
    membership: { role: TeamRole } | null;
}

export function canViewTeam(ctx: AuthContext): boolean {
    return ctx.isSuperAdmin || ctx.membership !== null;
}

export function canManageRoster(ctx: AuthContext): boolean {
    if (ctx.isSuperAdmin) return true;
    return ctx.membership?.role === 'coach' || ctx.membership?.role === 'manager';
}

export function canDeleteTeam(ctx: AuthContext): boolean {
    return ctx.isSuperAdmin;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: `9 passed` (the 8 permission tests + nothing else, since the smoke test is about to be removed).

- [ ] **Step 5: Delete the smoke test**

Run: `rm lib/teamPlatform/smoke.test.ts`

- [ ] **Step 6: Run tests once more to confirm nothing broke**

Run: `npm test`
Expected: `8 passed`

- [ ] **Step 7: Commit**

```bash
git add lib/teamPlatform/permissions.ts lib/teamPlatform/permissions.test.ts
git rm lib/teamPlatform/smoke.test.ts
git commit -m "feat: add team permission-check functions"
```

---

## Task 4: Auth context builder (TDD, mocked DB)

**Files:**
- Create: `lib/teamPlatform/getAuthContext.ts`
- Test: `lib/teamPlatform/getAuthContext.test.ts`

**Interfaces:**
- Consumes: `AuthContext` type from `lib/teamPlatform/permissions.ts` (Task 3); `db` default export from `@/lib/db`.
- Produces: `getAuthContext(userId: string, userRole: string, teamId: string): Promise<AuthContext>` — used by every API route task that needs a permission check.

- [ ] **Step 1: Write the failing tests**

Create `lib/teamPlatform/getAuthContext.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { getAuthContext } from './getAuthContext';

describe('getAuthContext', () => {
    it('marks an admin as super-admin without needing a team_members row', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        const ctx = await getAuthContext('user-1', 'admin', 'team-1');
        expect(ctx.isSuperAdmin).toBe(true);
        expect(ctx.membership).toBeNull();
    });

    it('returns the membership role for a regular user who is a team member', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{ role: 'coach' }] });
        const ctx = await getAuthContext('user-2', 'user', 'team-1');
        expect(ctx.isSuperAdmin).toBe(false);
        expect(ctx.membership).toEqual({ role: 'coach' });
    });

    it('returns null membership for a non-member', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        const ctx = await getAuthContext('user-3', 'user', 'team-1');
        expect(ctx.isSuperAdmin).toBe(false);
        expect(ctx.membership).toBeNull();
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './getAuthContext'`.

- [ ] **Step 3: Implement getAuthContext**

Create `lib/teamPlatform/getAuthContext.ts`:

```ts
import db from '@/lib/db';
import type { AuthContext } from './permissions';

export async function getAuthContext(userId: string, userRole: string, teamId: string): Promise<AuthContext> {
    const isSuperAdmin = userRole === 'admin';
    const { rows } = await db.query(
        'SELECT role FROM team_members WHERE user_id = $1 AND team_id = $2',
        [userId, teamId]
    );
    const membership = rows[0] ? { role: rows[0].role } : null;
    return { isSuperAdmin, membership };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: `11 passed` (8 permission tests + 3 new ones).

- [ ] **Step 5: Commit**

```bash
git add lib/teamPlatform/getAuthContext.ts lib/teamPlatform/getAuthContext.test.ts
git commit -m "feat: add getAuthContext for team permission lookups"
```

---

## Task 5: Teams API — create, list, detail, delete, admin list

**Files:**
- Create: `app/api/teams/route.ts`
- Create: `app/api/teams/admin/route.ts`
- Create: `app/api/teams/[teamId]/route.ts`

**Interfaces:**
- Consumes: `getAuthContext` (Task 4), `canViewTeam`/`canDeleteTeam` (Task 3), existing `authOptions` from `@/app/api/auth/[...nextauth]/route`, existing `ensureMigrations` from `@/lib/migrations`.
- Produces: `POST /api/teams`, `GET /api/teams`, `GET /api/teams/admin`, `GET /api/teams/[teamId]`, `DELETE /api/teams/[teamId]` — consumed by Task 7's pages.

No automated tests for this task (API routes are verified via manual preview per the Global Constraints) — write the code, then verify manually in Step 5.

- [ ] **Step 1: Create the teams list/create route**

Create `app/api/teams/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { ensureMigrations } from '@/lib/migrations';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const MAX_NAME_LENGTH = 100;

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { rows } = await db.query(`
            SELECT t.*, tm.role AS my_role FROM teams t
            INNER JOIN team_members tm ON tm.team_id = t.id
            WHERE tm.user_id = $1
            ORDER BY t.created_at DESC
        `, [(session.user as any).id]);

        return NextResponse.json(rows);
    } catch (err) {
        console.error('teams GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { name, sportType, role } = await request.json();

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
        }
        if (name.trim().length > MAX_NAME_LENGTH) {
            return NextResponse.json({ error: `Team name must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
        }
        if (role !== 'coach' && role !== 'manager') {
            return NextResponse.json({ error: "role must be 'coach' or 'manager'" }, { status: 400 });
        }

        const teamId = uuidv4();
        const userId = (session.user as any).id;

        await db.query(
            'INSERT INTO teams (id, name, sport_type, created_by) VALUES ($1, $2, $3, $4)',
            [teamId, name.trim(), sportType || 'hockey', userId]
        );

        await db.query(
            'INSERT INTO team_members (id, user_id, team_id, role) VALUES ($1, $2, $3, $4)',
            [uuidv4(), userId, teamId, role]
        );

        const { rows } = await db.query('SELECT * FROM teams WHERE id = $1', [teamId]);
        return NextResponse.json({ ...rows[0], my_role: role }, { status: 201 });
    } catch (err) {
        console.error('teams POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Create the super-admin all-teams route**

Create `app/api/teams/admin/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { ensureMigrations } from '@/lib/migrations';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if ((session.user as any).role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await ensureMigrations();

        const { rows } = await db.query('SELECT * FROM teams ORDER BY created_at DESC');
        return NextResponse.json(rows);
    } catch (err) {
        console.error('teams admin GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

- [ ] **Step 3: Create the team detail/delete route**

Create `app/api/teams/[teamId]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { ensureMigrations } from '@/lib/migrations';
import { getAuthContext } from '@/lib/teamPlatform/getAuthContext';
import { canViewTeam, canDeleteTeam } from '@/lib/teamPlatform/permissions';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ teamId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { teamId } = await params;
        const userId = (session.user as any).id;
        const userRole = (session.user as any).role;

        const { rows } = await db.query('SELECT * FROM teams WHERE id = $1', [teamId]);
        const team = rows[0];
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

        const ctx = await getAuthContext(userId, userRole, teamId);
        if (!canViewTeam(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        return NextResponse.json({ ...team, my_role: ctx.membership?.role ?? null });
    } catch (err) {
        console.error('team GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ teamId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { teamId } = await params;
        const userId = (session.user as any).id;
        const userRole = (session.user as any).role;

        const ctx = await getAuthContext(userId, userRole, teamId);
        if (!canDeleteTeam(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { rowCount } = await db.query('DELETE FROM teams WHERE id = $1', [teamId]);
        if (rowCount === 0) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('team DELETE error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify via dev server**

Start the dev server (`npm run dev`), log in as an existing YFL user, then in the browser console or via `curl` with a session cookie:
- `POST /api/teams` with `{"name":"Test Team","sportType":"hockey","role":"coach"}` → expect `201` with the created team + `my_role: "coach"`.
- `GET /api/teams` → expect an array containing that team.
- `GET /api/teams/<id>` → expect the team detail with `my_role`.
- `GET /api/teams/admin` as a non-admin user → expect `403`.

- [ ] **Step 6: Commit**

```bash
git add app/api/teams/route.ts app/api/teams/admin/route.ts "app/api/teams/[teamId]/route.ts"
git commit -m "feat: add teams API (create, list, detail, delete, admin list)"
```

---

## Task 6: Players (roster) API

**Files:**
- Create: `app/api/teams/[teamId]/players/route.ts`
- Create: `app/api/teams/[teamId]/players/[playerId]/route.ts`

**Interfaces:**
- Consumes: `getAuthContext` (Task 4), `canViewTeam`/`canManageRoster` (Task 3).
- Produces: `GET|POST /api/teams/[teamId]/players`, `PATCH|DELETE /api/teams/[teamId]/players/[playerId]` — consumed by Task 8's roster page.

- [ ] **Step 1: Create the roster list/add route**

Create `app/api/teams/[teamId]/players/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { ensureMigrations } from '@/lib/migrations';
import { getAuthContext } from '@/lib/teamPlatform/getAuthContext';
import { canViewTeam, canManageRoster } from '@/lib/teamPlatform/permissions';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ teamId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { teamId } = await params;
        const ctx = await getAuthContext((session.user as any).id, (session.user as any).role, teamId);
        if (!canViewTeam(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { rows } = await db.query(
            'SELECT * FROM players WHERE team_id = $1 ORDER BY jersey_number NULLS LAST, last_name ASC',
            [teamId]
        );
        return NextResponse.json(rows);
    } catch (err) {
        console.error('players GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ teamId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { teamId } = await params;
        const ctx = await getAuthContext((session.user as any).id, (session.user as any).role, teamId);
        if (!canManageRoster(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { firstName, lastName, position, jerseyNumber, phone, duesMonthly } = await request.json();

        if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
            return NextResponse.json({ error: 'firstName is required' }, { status: 400 });
        }
        if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
            return NextResponse.json({ error: 'lastName is required' }, { status: 400 });
        }

        const playerId = uuidv4();
        await db.query(
            `INSERT INTO players (id, team_id, first_name, last_name, position, jersey_number, phone, dues_monthly)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                playerId, teamId, firstName.trim(), lastName.trim(),
                position || null, jerseyNumber ?? null, phone || null, duesMonthly ?? 0,
            ]
        );

        const { rows } = await db.query('SELECT * FROM players WHERE id = $1', [playerId]);
        return NextResponse.json(rows[0], { status: 201 });
    } catch (err) {
        console.error('players POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Create the player edit/delete route**

Create `app/api/teams/[teamId]/players/[playerId]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { ensureMigrations } from '@/lib/migrations';
import { getAuthContext } from '@/lib/teamPlatform/getAuthContext';
import { canManageRoster } from '@/lib/teamPlatform/permissions';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ teamId: string; playerId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { teamId, playerId } = await params;
        const ctx = await getAuthContext((session.user as any).id, (session.user as any).role, teamId);
        if (!canManageRoster(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { firstName, lastName, position, jerseyNumber, phone, duesMonthly } = await request.json();

        const { rows: existingRows } = await db.query(
            'SELECT * FROM players WHERE id = $1 AND team_id = $2',
            [playerId, teamId]
        );
        if (!existingRows[0]) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

        // Note: COALESCE means a field can be updated to a new value but not
        // explicitly cleared to NULL. Acceptable for Phase 1's manual roster
        // entry — nobody needs to "unset" a jersey number yet.
        await db.query(
            `UPDATE players SET
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                position = COALESCE($3, position),
                jersey_number = COALESCE($4, jersey_number),
                phone = COALESCE($5, phone),
                dues_monthly = COALESCE($6, dues_monthly)
             WHERE id = $7`,
            [
                firstName?.trim() || null, lastName?.trim() || null, position ?? null,
                jerseyNumber ?? null, phone ?? null, duesMonthly ?? null, playerId,
            ]
        );

        const { rows } = await db.query('SELECT * FROM players WHERE id = $1', [playerId]);
        return NextResponse.json(rows[0]);
    } catch (err) {
        console.error('player PATCH error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ teamId: string; playerId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureMigrations();

        const { teamId, playerId } = await params;
        const ctx = await getAuthContext((session.user as any).id, (session.user as any).role, teamId);
        if (!canManageRoster(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { rowCount } = await db.query(
            'DELETE FROM players WHERE id = $1 AND team_id = $2',
            [playerId, teamId]
        );
        if (rowCount === 0) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('player DELETE error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manually verify via dev server**

With the dev server running and logged in as the coach/manager of the test team created in Task 5:
- `POST /api/teams/<teamId>/players` with `{"firstName":"Jane","lastName":"Doe","position":"Forward","jerseyNumber":9}` → expect `201`.
- `GET /api/teams/<teamId>/players` → expect an array containing that player.
- `PATCH /api/teams/<teamId>/players/<playerId>` with `{"jerseyNumber":10}` → expect the updated row.
- `DELETE /api/teams/<teamId>/players/<playerId>` → expect `{"ok":true}`, then confirm `GET` no longer returns it.
- Repeat `POST` while logged in as a `player`-role user (or a non-member) → expect `403`.

- [ ] **Step 5: Commit**

```bash
git add "app/api/teams/[teamId]/players/route.ts" "app/api/teams/[teamId]/players/[playerId]/route.ts"
git commit -m "feat: add players (roster) API"
```

---

## Task 7: Pages — teams list, create, admin list

**Files:**
- Create: `app/teams/page.tsx`
- Create: `app/teams/new/page.tsx`
- Create: `app/teams/admin/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/teams`, `GET /api/teams/admin` (Task 5).

- [ ] **Step 1: Create the teams list page**

Create `app/teams/page.tsx`:

```tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

interface TeamListItem {
    id: string;
    name: string;
    sport_type: string;
    my_role: 'coach' | 'manager' | 'player';
}

export default function TeamsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [teams, setTeams] = useState<TeamListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login?next=/teams');
    }, [status, router]);

    useEffect(() => {
        if (!session) return;
        fetch('/api/teams')
            .then(res => res.json())
            .then(setTeams)
            .catch(() => setError('Could not load your teams.'))
            .finally(() => setLoading(false));
    }, [session]);

    const isSuperAdmin = (session?.user as any)?.role === 'admin';

    if (status === 'loading' || loading) {
        return (
            <div>
                <Navbar />
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Your teams</h1>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {isSuperAdmin && (
                            <Link href="/teams/admin" className="btn">All teams (admin)</Link>
                        )}
                        <Link href="/teams/new" className="btn btn-primary">Create a team</Link>
                    </div>
                </div>

                {error && <div className="auth-error">{error}</div>}

                {teams.length === 0 && !error && (
                    <p style={{ color: 'var(--text-muted)' }}>
                        You&apos;re not part of any team yet. Create one, or use an invite link from a coach/manager.
                    </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {teams.map(team => (
                        <Link
                            key={team.id}
                            href={`/teams/${team.id}`}
                            style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1rem 1.25rem', borderRadius: 12,
                                border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 700 }}>{team.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{team.sport_type}</div>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'capitalize' }}>
                                {team.my_role}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Create the new-team form page**

Create `app/teams/new/page.tsx`:

```tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';

const SPORTS = ['hockey', 'football', 'basketball', 'volleyball', 'other'];

export default function NewTeamPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [name, setName] = useState('');
    const [sportType, setSportType] = useState('hockey');
    const [role, setRole] = useState<'coach' | 'manager'>('coach');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login?next=/teams/new');
    }, [status, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, sportType, role }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to create team');
                return;
            }
            router.push(`/teams/${data.id}`);
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (status !== 'authenticated') return null;

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '3rem 1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem' }}>Create a team</h1>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="name">Team name</label>
                        <input
                            id="name" type="text" className="input" required
                            value={name} onChange={e => setName(e.target.value)}
                            placeholder="e.g. Riga Wolves"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="sportType">Sport</label>
                        <select id="sportType" className="input" value={sportType} onChange={e => setSportType(e.target.value)}>
                            {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Your role on this team</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <input type="radio" name="role" checked={role === 'coach'} onChange={() => setRole('coach')} />
                                Coach
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <input type="radio" name="role" checked={role === 'manager'} onChange={() => setRole('manager')} />
                                Manager
                            </label>
                        </div>
                    </div>
                    {error && <div className="auth-error">{error}</div>}
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating…' : 'Create team'}
                    </button>
                </form>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Create the super-admin all-teams page**

Create `app/teams/admin/page.tsx`:

```tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

interface TeamRow {
    id: string;
    name: string;
    sport_type: string;
    created_by: string;
}

export default function AdminTeamsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [teams, setTeams] = useState<TeamRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login?next=/teams/admin');
    }, [status, router]);

    useEffect(() => {
        if (!session) return;
        if ((session.user as any).role !== 'admin') {
            router.push('/teams');
            return;
        }
        fetch('/api/teams/admin')
            .then(res => res.json())
            .then(setTeams)
            .catch(() => setError('Could not load teams.'))
            .finally(() => setLoading(false));
    }, [session, router]);

    if (status === 'loading' || loading) {
        return (
            <div>
                <Navbar />
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem' }}>All teams</h1>
                {error && <div className="auth-error">{error}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {teams.map(team => (
                        <Link
                            key={team.id}
                            href={`/teams/${team.id}`}
                            style={{
                                display: 'block', padding: '1rem 1.25rem', borderRadius: 12,
                                border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
                            }}
                        >
                            <div style={{ fontWeight: 700 }}>{team.name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{team.sport_type}</div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/teams/page.tsx app/teams/new/page.tsx app/teams/admin/page.tsx
git commit -m "feat: add teams list, create, and admin pages"
```

---

## Task 8: Pages — team dashboard + roster management

**Files:**
- Create: `app/teams/[teamId]/page.tsx`
- Create: `app/teams/[teamId]/roster/page.tsx`

**Interfaces:**
- Consumes: `GET/DELETE /api/teams/[teamId]`, `GET/POST /api/teams/[teamId]/players`, `DELETE /api/teams/[teamId]/players/[playerId]` (Tasks 5 & 6).

- [ ] **Step 1: Create the team dashboard page**

Create `app/teams/[teamId]/page.tsx`:

```tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

interface TeamDetail {
    id: string;
    name: string;
    sport_type: string;
    my_role: 'coach' | 'manager' | 'player' | null;
}

export default function TeamDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ teamId: string }>();
    const [team, setTeam] = useState<TeamDetail | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') router.push(`/login?next=/teams/${params.teamId}`);
    }, [status, router, params.teamId]);

    useEffect(() => {
        if (!session) return;
        fetch(`/api/teams/${params.teamId}`)
            .then(async res => {
                if (!res.ok) throw new Error((await res.json()).error || 'Failed to load team');
                return res.json();
            })
            .then(setTeam)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [session, params.teamId]);

    if (status === 'loading' || loading) {
        return (
            <div>
                <Navbar />
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
            </div>
        );
    }

    if (error || !team) {
        return (
            <div>
                <Navbar />
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {error || 'Team not found'}
                </div>
            </div>
        );
    }

    const canManageRoster = team.my_role === 'coach' || team.my_role === 'manager' || (session?.user as any)?.role === 'admin';

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{team.name}</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', textTransform: 'capitalize' }}>
                    {team.sport_type} · your role: {team.my_role ?? 'super admin'}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link href={`/teams/${team.id}/roster`} className="btn btn-primary">
                        {canManageRoster ? 'Manage roster' : 'View roster'}
                    </Link>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Create the roster management page**

Create `app/teams/[teamId]/roster/page.tsx`:

```tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '../../../components/Navbar';

interface PlayerRow {
    id: string;
    first_name: string;
    last_name: string;
    position: string | null;
    jersey_number: number | null;
}

export default function RosterPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams<{ teamId: string }>();
    const [players, setPlayers] = useState<PlayerRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [canManage, setCanManage] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [position, setPosition] = useState('');
    const [jerseyNumber, setJerseyNumber] = useState('');
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push(`/login?next=/teams/${params.teamId}/roster`);
    }, [status, router, params.teamId]);

    const loadRoster = () => {
        fetch(`/api/teams/${params.teamId}/players`)
            .then(async res => {
                if (!res.ok) throw new Error((await res.json()).error || 'Failed to load roster');
                return res.json();
            })
            .then(setPlayers)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!session) return;
        fetch(`/api/teams/${params.teamId}`)
            .then(res => res.json())
            .then(team => {
                const role = team.my_role;
                setCanManage(role === 'coach' || role === 'manager' || (session.user as any).role === 'admin');
            });
        loadRoster();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, params.teamId]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError('');
        setAdding(true);
        try {
            const res = await fetch(`/api/teams/${params.teamId}/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName, lastName,
                    position: position || undefined,
                    jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setAddError(data.error || 'Failed to add player');
                return;
            }
            setFirstName(''); setLastName(''); setPosition(''); setJerseyNumber('');
            loadRoster();
        } catch {
            setAddError('An error occurred. Please try again.');
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (playerId: string) => {
        await fetch(`/api/teams/${params.teamId}/players/${playerId}`, { method: 'DELETE' });
        loadRoster();
    };

    if (status === 'loading' || loading) {
        return (
            <div>
                <Navbar />
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem' }}>Roster</h1>
                {error && <div className="auth-error">{error}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                    {players.map(p => (
                        <div key={p.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.75rem 1rem', borderRadius: 10,
                            border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
                        }}>
                            <div>
                                <strong>{p.first_name} {p.last_name}</strong>
                                {p.position && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{p.position}</span>}
                                {p.jersey_number != null && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>#{p.jersey_number}</span>}
                            </div>
                            {canManage && (
                                <button type="button" className="btn" onClick={() => handleRemove(p.id)}>Remove</button>
                            )}
                        </div>
                    ))}
                    {players.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No players on the roster yet.</p>}
                </div>

                {canManage && (
                    <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 360 }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add a player</h2>
                        <input className="input" placeholder="First name" required value={firstName} onChange={e => setFirstName(e.target.value)} />
                        <input className="input" placeholder="Last name" required value={lastName} onChange={e => setLastName(e.target.value)} />
                        <input className="input" placeholder="Position (optional)" value={position} onChange={e => setPosition(e.target.value)} />
                        <input className="input" type="number" placeholder="Jersey number (optional)" value={jerseyNumber} onChange={e => setJerseyNumber(e.target.value)} />
                        {addError && <div className="auth-error">{addError}</div>}
                        <button type="submit" className="btn btn-primary" disabled={adding}>
                            {adding ? 'Adding…' : 'Add player'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/teams/[teamId]/page.tsx" "app/teams/[teamId]/roster/page.tsx"
git commit -m "feat: add team dashboard and roster management pages"
```

---

## Task 9: Full verification pass

**Files:** none created — this task only verifies.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass (11 from Tasks 3 & 4).

- [ ] **Step 2: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds; new routes (`/teams`, `/teams/new`, `/teams/admin`, `/teams/[teamId]`, `/teams/[teamId]/roster`) appear in the route summary.

- [ ] **Step 4: Manual end-to-end walkthrough in the browser**

With the dev server running:
1. Log in as an existing YFL user, visit `/teams` → see empty state + "Create a team" button.
2. Click through to `/teams/new`, create a team as `coach` → redirected to `/teams/[teamId]`, showing the team name and role.
3. Click "Manage roster" → add two players via the form, confirm they appear in the list.
4. Remove one player, confirm it disappears.
5. Log in as a YFL admin account, visit `/teams/admin` → confirm the created team appears in the all-teams list.
6. Log in as a third, unrelated YFL user, attempt to visit `/teams/[teamId]/roster` for the team created in step 2 → confirm the "Add a player" form and "Remove" buttons do not appear (view-only would require being a team member; a true non-member gets a 403 from the underlying API — confirm the page doesn't crash and shows a reasonable state).

- [ ] **Step 5: Final commit (if any fixes were needed during verification)**

```bash
git add -A
git commit -m "fix: address issues found during Phase 1 verification"
```

(Skip this step if verification found nothing to fix.)
