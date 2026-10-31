# Basketball Practice Planner

A touch-first basketball practice planner and live coaching tool. It is a static web app with no build step. Deploy it over HTTPS (for example, GitHub Pages) to install it as a PWA and cache it for offline gym use.

## App layout

- **Plans** — create multiple plans per team, duplicate plans, and run a fresh repeat. Each plan stores its own date, practice window, schedule, completion/skip history, and equipment checklist.
- **Drills** — browse the bank, filter by any associated skill, and create or edit drills.
- **Teams** — add, rename, or delete teams; edit player names; add or remove players. Groups are not managed here.
- **Stats** — review planned, completed, and skipped work by skill. Filter the history and summaries to an inclusive date range.

## Practice plans

- Add drills from the drill-bank sheet or create a station rotation.
- Each drill has a name, minute allotment, zero or more equal skill tags, equipment, numbered instructions, and optional player groups.
- Every scheduled drill shows its start and end time. Drills within a station lane also show their individual times.
- A station is one timed block with concurrent lanes. Its duration governs the sequence in each lane: lane drill minutes are proportionally adjusted to fill the station window, with at least one minute per drill.
- Each lane contains the same editable drill objects used in the main schedule. Press and hold a drill's grip, then drag it to reorder, move it between lanes, or pull it into the main plan. Dragging provides a floating label, insertion feedback, and edge auto-scroll.
- **Fit time** redistributes the schedule's block durations to the practice window using whole minutes and an exact total. It also fits station lane sequences to their station durations.

## Drill groups

- Open the **Groups** control on an individual scheduled drill.
- Add as many groups as needed and rename them.
- Press and hold a player, then drag them into a group. Dropping onto another player's row swaps the two players.
- **Randomize** assigns the roster as evenly as possible across the groups for that drill. Each drill retains its own assignment.

## Live practice

- Open a plan and tap **Start practice**. The equipment checklist opens first; confirm when the gear is ready to begin.
- The current drill expands in the plan with its equipment and numbered instructions.
- When the current block is a station rotation, the entire station is highlighted and all lane drills expand together.
- **Done · Next** marks the current drill or all drills in the station complete. **Skip** marks the block skipped. Previous and End are manual; there is no timer.
- Live controls stay in a bottom bar for thumb reach. The app requests Screen Wake Lock while live when the browser supports it; the browser or device may decline the request.

## Skills and statistics

- Drills may have multiple skill tags. There is no primary skill.
- A drill's minutes are divided as evenly as possible across its associated skills, so a multi-skill drill is not counted in full under every tag. Concurrent station lanes represent simultaneous drill work, so the sum of skill work across lanes can exceed the station's court-clock duration.
- Add, rename, recolor, or delete skills from **Drills → Skills**. Renaming a skill updates existing bank drills and all saved plan drills. Deleting a skill removes that tag from those drills.
- The stats date range includes plans on both selected dates. Leave either end blank to keep that side open; clear both dates to view all-time stats.

## Equipment

- Add equipment with a quantity and optionally mark the quantity **per player**.
- The equipment sheet calculates peak requirements: sequential drills can reuse gear, while simultaneous station lanes are combined.
- Checklist checks are saved with their individual plan.

## PDF and backups

- The PDF filename is **TeamName_YYYY-MM-DD.pdf**.
- The landscape handout preserves the plan's schedule order, numbers drills, shows their clock times, groups station lanes under station headings, and includes equipment and numbered instructions.
- Skill colors use one segment per associated skill. The PDF keeps a readable minimum font size, moves dense plans to A3, and adds pages as needed. An unusually long single instruction is split across pages with continuation context.
- JSON backup/restore includes teams, players, the drill bank, plans, per-drill groups, custom skills, and equipment checklists. Restore and team deletion ask for confirmation; Undo remains available after supported edits and deletions.
- Data is stored locally in the current browser. It does not automatically sync across devices.

## Migration

On first launch after the upgrade, the app migrates saved teams, rosters, plans, custom drills, skill tags, and station rotations. Old primary skills are retained as ordinary skill tags. Existing station durations become editable station minutes, and lane drill durations are normalized to fit the station window. Legacy roster jersey numbers are retained in storage but are not shown in the current roster editor. Review migrated equipment quantities once, especially older free-text descriptions.

## Project structure

- `index.html` — application shell and sheets
- `css/app.css` — mobile-first styling and responsive layouts
- `js/app.js` — UI event controller
- `js/core/store.js` — domain model, migration, persistence, and undo
- `js/ui/render.js` — screen and component rendering
- `js/features/practice.js` — schedule, fit-time, and live-practice operations
- `js/features/groups.js` — per-drill player grouping and swapping
- `js/features/teams.js` — team and roster operations
- `js/features/skills.js` — skill-library operations
- `js/services/export.js` — PDF and JSON export/import
- `js/data/drills.js` — basketball drill catalog and skill color defaults
- `vendor/jspdf.umd.min.js` — bundled jsPDF 4.2.1 (MIT license alongside it)
- `manifest.webmanifest`, `service-worker.js`, `icons/` — installability, caching, and app icons

## GitHub Pages

Open repository **Settings → Pages**, choose **Deploy from a branch**, select `main` and the root folder, then save. Open the published HTTPS URL once while online so the service worker can cache the app.
