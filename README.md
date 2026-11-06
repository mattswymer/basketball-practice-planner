# Basketball Practice Planne

A mobile-first basketball practice planner built with static HTML, CSS, and JavaScript. No build step or backend is required. Data is stored locally in the browser.

**Live app:** https://mattswymer.github.io/basketball-practice-planner/

## Practice plans
- Create plans for multiple teams and set practice dates and time windows.
- Add, edit, remove, and reorder drills.
- Fit the schedule to the available practice window.
- Duplicate plans and export printable PDFs.

## Station rotations
A rotation contains multiple stations. Groups begin at different stations and move to the next station together at each whistle. A complete rotation has one round per station, so every group visits every station once. Each station can contain an ordered sequence of activities; the round lasts long enough for the longest station sequence to finish. All stations operate concurrently during each round. Total rotation time is the round duration multiplied by the number of stations.

## Drill library and teams
- Maintain a reusable drill bank with skills, equipment, notes, and instructions.
- Manage teams and player rosters.
- Assign players to drill groups, swap players, or randomize groups.
- Import and export drill libraries.

## Live practice and stats
- Highlight the current drill or station round and expand its instructions.
- Navigate manually; there is no automatic timer or completion tracking.
- Review planned time by skill and filter practice history by date.
- A drill's full duration counts toward every skill tag. A five-minute drill tagged Shooting and Dribbling contributes five minutes to each skill.

## Equipment, PDF, and backups
- Equipment totals account for per-player quantities and simultaneous station activities.
- PDF exports include schedule timing, skills, equipment, notes, and instructions.
- JSON backups include teams, players, plans, drills, skills, colors, and group assignments.
- Data stays in the current browser and does not sync automatically between devices.

## Project structure
| Path | Purpose |
| --- | --- |
| `index.html` | App shell and dialogs |
| `css/app.css` | Responsive styling |
| `js/app.js` | UI events and workflows |
| `js/core/store.js` | Data model, migration, persistence, and undo |
| `js/ui/render.js` | Screen rendering |
| `js/features/practice.js` | Scheduling and live practice |
| `js/features/groups.js` | Player grouping |
| `js/features/teams.js` | Team and roster operations |
| `js/features/skills.js` | Skill management |
| `js/services/export.js` | PDF and JSON backup/import |
| `js/data/drills.js` | Built-in drills and skill colors |
| `vendor/` | Bundled PDF library |
| `manifest.webmanifest`, `service-worker.js`, `icons/` | PWA and offline support |

## Deployment
Deploy the repository root from the `main` branch using GitHub Pages. Open the published HTTPS site once while online so the service worker can cache the app shell. Increment the service-worker cache version whenever app assets change.

## Data migration
Saved data is normalized on startup. Legacy station data is migrated into the current station/activity model where possible. A pre-migration snapshot is retained in local storage; a downloaded JSON backup is still the recommended recovery copy.
