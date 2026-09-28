# NHL demo league

A clearly labelled open league, **NHL Demo League**, with 11 fictional players,
so the site shows a busy league the moment someone looks around. It runs on
real NHL games from the free NHL source:

- **History:** last season's final 16 playoff games, with the real scores,
  everyone's picks and a full league table.
- **Coming up:** the next week's games (up to 3 a day). Every scheduled sync
  (`/api/fixtures/sync`) adds new games a week ahead, and the fictional players
  pick games as kick-off gets closer, so pick counts grow the way they would in
  a real league. Results arrive automatically, so the table keeps changing.
- **Real users can join** from *Browse open leagues* and play against the
  fictional players.

## Turning it on and off

Owner page → **Demo league** tab → **Create demo league** (the first run
fetches two NHL seasons and takes about a minute). **Remove demo league**
deletes the league and every fictional player.

## Guard rails

- Fictional players and the league are flagged `is_demo`. They have no
  password and no sign-in provider, so nobody can log in as them.
- The owner Overview numbers leave demo data out, so they stay real.
- Code: `lib/demo.ts` (`seedDemoLeague`, `topUpDemoLeague`, `removeDemoLeague`),
  owner endpoint `app/api/owner/demo`.
