# Database

PostgreSQL (Neon in production). The schema lives in one place,
[`lib/migrations.ts`](../lib/migrations.ts). It runs automatically when the
server starts (`instrumentation.ts`) and again, cheaply, from API routes that
need it. Every statement is idempotent, so running it on the live database
changes nothing that already exists.

**Fresh local database:** create an empty Postgres database, set
`DATABASE_URL`, and start the app (`npm run dev`). The first start creates
every table and seeds the sports list. `npm run db:init` (scripts/init_pg.js)
still works but only creates the original core tables.

Timestamps are Unix seconds (`BIGINT`/`INTEGER`), not `TIMESTAMP`.

## How the pieces fit

```
users ──< tournament_participants >── tournaments ──< matches ──< predictions
                                          │             └──────< race_weekend_predictions
                                          └──< race_drivers
```

A **tournament** is a league. People join it (`tournament_participants`),
the organiser adds **matches**, players make **predictions** before kick-off,
and when the organiser enters the final result the points are calculated on
the fly by `lib/scoring.ts`. Points are never stored.

## Tables

### Core

| Table | What it holds | Key columns |
|---|---|---|
| `users` | Accounts (email/password or OAuth) | `role`: `user`, `premium` (can run leagues) or `admin`; `oauth_provider`; Stripe fields: `stripe_customer_id`, `subscription_status`, `subscription_plan`, `current_period_end` |
| `tournaments` | Leagues | `created_by` (organiser), `join_code` (6 chars, used in invite links), `league_type` (`open` = anyone can join, `private` = code only), `is_active` (false = closed, predictions locked), `max_participants` (0 = unlimited), `race_bonus_config` (F1 bonus questions switched on) |
| `tournament_participants` | Who is in which league | unique (`tournament_id`, `user_id`), `joined_at` |
| `matches` | Fixtures in a league | `scheduled_time` (kick-off; predictions lock at this moment), `is_finished` + `team_a_score`/`team_b_score` (result), `match_type` (`score`, `series`, `race`), `series_format` (`BO1`/`BO3`/`BO5`), `is_playoff` (no draws), `source` (`manual`, `api`), race results: `top10_result`, `pole_result`, `fastest_lap_result`, … , `is_season_finale` (×2 points) |
| `predictions` | Score/series picks | unique (`match_id`, `user_id`); `team_a_score`, `team_b_score` |
| `race_weekend_predictions` | F1 picks | unique (`match_id`, `user_id`); `picks` (Top 10 order, JSON), bonus picks (`pole_pick`, `fastest_lap_pick`, …) |
| `race_drivers` | Driver roster per F1/MotoGP league | `tournament_id`, `driver_name`, `team_name`, `number` |
| `sports` | Sports offered when creating a league | `name` (seeded on a fresh database) |

### Supporting

| Table | What it holds |
|---|---|
| `notifications` | In-app messages (e.g. "you scored 5 points"), `is_read` |
| `password_reset_tokens` | Hashed, expiring reset tokens (`token_hash`, `expires_at`, `used`) |
| `api_leagues`, `api_matches`, `api_races` | Fixtures synced from API-Sports, the NHL API and Jolpica-F1, ready for organisers to import into a league |
| `news_items` | Cached sports news (created by `lib/news.ts`) |
| `team_logos` | Cached team/country logo URLs (created by `lib/teamLogos.ts`) |
| `achievements`, `user_achievements` | Achievement badges (not used in the UI yet) |
| `race_predictions` | **Legacy** P1/P2/P3 picks, replaced by `race_weekend_predictions`. Kept, unused, so no data is lost |

## Scoring (calculated, not stored)

| Match type | Rules |
|---|---|
| Score / series | Exact result **5**, right winner and margin **3**, right winner **2**, otherwise **0** |
| Race (F1) | Top 10 order: exact **5**, one place off **3**, two off **2**, in the Top 10 **1**; race-only bonuses: winner **3**, podium **5** (exact) or **3** (right three), pole **3**, fastest lap **3**, first retirement **2**, safety car **2**, optional extras; sprint ×0.5, season finale ×2 |

## Rules the API enforces

- Predictions lock at `scheduled_time` and when a league is closed (`is_active = false`).
- Other players' picks are hidden on the rankings until the match starts.
- Only the league's creator can add matches or enter results.
