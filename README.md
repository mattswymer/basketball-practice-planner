# Basketball Practice Planner

A phone-first basketball practice planning app. It is a static site with no build step. Serve it from HTTPS (for example, GitHub Pages) to install it and use its offline cache.

## Main workflow

- **Plans** — create multiple named practice plans for each team. Each plan owns its date, start/end time, schedule, and equipment checklist.
- **Drills** — browse the drill bank, add drills to a plan, and edit either the bank drill or an individual scheduled copy.
- **Teams** — manage teams and player rows (jersey number + name), assign groups, randomize groups, and rename/delete teams.
- **Stats** — see planned and manually completed minutes by each drill's single primary skill. Secondary tags are filters/metadata and are not counted, so skill totals do not double-count.

## Practice plans

- Tap a plan to open it. Use the **+** button to add a drill from the bottom sheet.
- Tap a scheduled drill to edit its name, primary skill, minutes, equipment, and individual instruction steps.
- Use the grip handle: press and hold, then drag to reorder or move an individual drill between the plan and station lanes.
- A station rotation contains concurrent lanes. Each lane holds the same editable drill objects used by the main plan. Drills keep their own minutes, skill, equipment, and steps when moved.
- Lane time is the sum of drills in that lane; station time is the longest lane (lanes run concurrently).
- Empty lanes are placeholders only. They are ignored by stats, equipment totals, and the PDF.

## Live practice

- Open a plan and tap **Start practice**.
- The current drill expands in place with full equipment and numbered instructions. The whole card uses its primary-skill color.
- **Done · Next** marks the current drill complete and advances. Previous and End are manual; there is no timer.
- The app requests Screen Wake Lock during live practice when the browser supports it. The screen may still lock if the browser or device does not grant the request.

## Equipment

- Add any equipment item with a quantity and optionally mark it **per player**.
- The plan's equipment sheet aggregates quantities across all drills, including station lanes, and saves checklist checks on that plan.
- Known legacy text such as “one ball for each player” is migrated as a per-player quantity. Review migrated equipment quantities once after upgrading, especially vague notes such as “all cones”.

## Export and storage

- The PDF export uses bundled jsPDF and creates a one-page, color-coded landscape handout with numbered steps. A4 is used by default; dense plans switch to one-page A3 rather than silently spilling onto a second page. Review condensed plans for readability before sharing.
- JSON backup/restore includes teams, players, groups, drills, plans, and saved equipment checks.
- Data is stored locally in this browser. It does not automatically sync between devices. Use Backup to move data.
- The service worker caches the app shell and PDF library after the first successful online visit.

## Data migration

On first load after this update, the app migrates the previous planner's teams, rosters, drill bank, and saved schedules into the new format. The old one-schedule-per-team practice becomes a plan named **Practice plan** for each team, with the old date and time window copied into that plan. Existing custom drill edits are retained where the drill IDs or names match.

## Files

- `index.html` — app layout and bottom sheets
- `css_style.css` — touch-first mobile styling and skill colors
- `js/store.js` — plan-first data model, migration, persistence, and undo
- `js/render.js` — Plans, Drills, Teams, Stats, and schedule rendering
- `js/app.js` — UI interactions, touch sorting, and manual live mode
- `js/export.js` — one-page PDF and JSON backup
- `js_drills_db.js` — basketball drill library and primary-skill palette
- `vendor/jspdf.umd.min.js` — vendored jsPDF 4.2.1 (MIT license in the same folder)
- `manifest.webmanifest` and `service-worker.js` — installability and offline app shell

## GitHub Pages

Open repository **Settings → Pages**, choose **Deploy from a branch**, select `main` and the root folder, then save. Open the published HTTPS URL once while online so the service worker can cache the app.
