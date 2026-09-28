# Results: automatic, reported by players, or entered by hand

Matches an organiser **imports** (Manage → Import fixtures) are linked to a
fixture feed. The app fills in their results by itself, so players get their
points shortly after the final whistle. Matches added by hand or from a
tournament preset have no feed and still need the organiser to enter them.

| Feed | Sports | What comes in automatically |
|---|---|---|
| API-Sports | Football, Ice Hockey | Final score (see rules below), postponements, moved kick-offs |
| NHL API | NHL | Final score, postponements, moved kick-offs |
| Jolpica-F1 | Formula 1 (main race) | Full Top 10, pole, fastest lap, first retirement, most positions gained/lost, winning margin, retirements count |

## Rules

- **Score used:** the score after extra time. If a game was level and went to
  penalties, the shoot-out winner gets +1 (1–1, won 4–3 on penalties → 2–1),
  so knockouts always have a winner. NHL scores already work this way.
- **Never overwrites the organiser.** A result entered by hand stays. If the
  official result is different, the match gets a note on the Manage page
  ("Official result: 3–0. Your entry is 0–0; please check it.").
- **Needs the organiser** when the data can't decide: a level knockout without
  shoot-out data, an F1 bonus answer that's a tie (e.g. two drivers lost the
  same number of places), and the F1 safety car question, which isn't in the
  data. The match shows a note saying what's missing.
- **Postponed / cancelled** fixtures get a note. A moved kick-off is followed
  automatically while the match hasn't started.
- **Corrections** (e.g. a post-race penalty) update results that were filled in
  automatically.
- F1 driver names are matched to the league's driver list by full name, then
  surname, so a list with just "Verstappen" works.
- Players are notified only when someone predicted the match (no "no
  prediction" messages for old fixtures imported with their result).

## Results reported by players

For matches without a feed (added by hand or from a preset), and as a backup
for imported ones: once a match has started and has no result, players see
**Report final score** on the predictions page. Nothing is scored from a
report on its own. On the Manage page the organiser sees
"Players say 2–1 (3 players) · also 2–2 (1)" with a **Confirm 2–1** button,
which enters the result as usual. The organiser gets one notification per
match, on the first report. Races aren't included (their results have too
many parts).

## How it runs

1. **Every 30 minutes**, Cloud Scheduler calls `POST /api/fixtures/sync`. It
   only calls a feed when that source has a game or race in progress or just
   finished, or hasn't been refreshed for a day. This keeps well inside the
   API-Sports free allowance (100 requests a day per sport). `?full=1`
   refreshes every source.
2. **"Check for results now"** on the Manage page does the same for one league
   straight away (a feed checked in the last 10 minutes isn't called again).
3. Importing fixtures that have already finished fills their results
   immediately.

## One-time setup: the 30-minute job

The existing Cloud Scheduler job `fixture-sync-daily` already calls this
endpoint once a day (06:00 UTC) with the `FIXTURE_SYNC_SECRET` bearer token.
Switch it to every 30 minutes:

```bash
gcloud scheduler jobs update http fixture-sync-daily \
  --location=us-central1 \
  --schedule="*/30 * * * *" \
  --attempt-deadline=300s
```

(Use the job's real region if it isn't `us-central1`:
`gcloud scheduler jobs list` shows it.) If the job doesn't exist, create it:

```bash
gcloud scheduler jobs create http fixture-sync-daily \
  --location=us-central1 \
  --schedule="*/30 * * * *" \
  --uri="https://app.yourfriendleague.com/api/fixtures/sync" \
  --http-method=POST \
  --headers="Authorization=Bearer YOUR_FIXTURE_SYNC_SECRET" \
  --attempt-deadline=300s
```

Test it with `gcloud scheduler jobs run fixture-sync-daily --location=us-central1`.
The response lists the sources it refreshed, plus `resultsApplied`
(`filled`, `corrected`, `flagged`, `rescheduled`).

## Formula 1: how results get in

1. **Owner page → API Leagues:** choose *Formula 1 — Jolpica (free)*, enter the
   season (e.g. 2026) and sync. This loads the calendar; no key needed.
2. **Your F1 league → Manage → Import fixtures:** pick the races to add.
   Add your drivers under the *Drivers* tab (surnames are enough).
3. After each Grand Prix the 30-minute sync (or **Check for results now**)
   fills in the Top 10 and the bonus answers. Only the safety car question is
   left for you; the match shows a note until you add it.

Sprints and qualifying sessions added by hand still need their results
entered on the Manage page.
