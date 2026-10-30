# Basketball Practice Planner

A lightweight, browser-based basketball practice planner and live coaching companion. It runs directly from GitHub Pages; no build step, npm installation, server, or account is required.

## Features

### Build a practice
- Search the activity library by drill name, instruction, or equipment.
- Filter by skill tag and sort by name or estimated duration.
- Add drills, edit the scheduled copy, reorder by buttons or drag-and-drop, and remove activities.
- Adjust estimated durations and fit the practice to a gym time window using proportional, whole-minute allocation.
- See scheduled start/end times, total planned minutes, remaining time, or overtime.

### Run a practice
- Start a live countdown for each activity.
- Pause and resume, move to the previous or next activity, or end the session.
- Keep the current activity's instructions, coaching cues, and equipment visible.
- The timer uses a deadline rather than counting interval ticks, reducing drift if the browser is briefly busy.

### Run stations concurrently
- Create a station rotation with multiple activities.
- Set one total block duration; stations run at the same time and count once in the practice schedule.
- View each station's setup, instructions, skill tags, and equipment in the plan and live coaching panel.

### Manage teams and preparation
- Keep separate practice schedules and rosters for each team.
- Select present players and randomize them into balanced groups.
- Aggregate equipment across the practice and station activities into a checklist.
- Create custom drills and update a bank default from a scheduled copy when desired.

### Save, export, and print
- Changes save in the current browser using localStorage.
- Export and import JSON to move the activity library, teams, rosters, and practice plans between browsers or computers.
- Print a clean practice sheet or save it as a PDF using the browser's print dialog.
- Undo recent planning changes.

## Drill library

The initial library contains **60 activities**:
- 33 current activities supplied in the coach's updated activity list.
- 27 additional activities retained from the 2025–2026 practice workbook because they were not in the updated list.

Where a drill appears in both sources, the coach-supplied description, duration, and tags take precedence. Historical-only activities remain available as additional options. The supplied descriptions are treated as the source content, not as independently verified coaching guidance.

## Run locally

Download or clone the repository and open `index.html` in a modern browser. The app uses these files:

- `index.html` — interface and dialogs
- `css_style.css` — layout and styles
- `js_app.js` — planner, persistence, station, and live-practice behavior
- `js_drills_db.js` — default tags and activity library

## Publish with GitHub Pages

1. Open the repository's **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select the `main` branch and the root (`/`) folder.
4. Save. GitHub Pages will publish the site.

## Data and privacy

Practice data is stored locally in the browser profile on the device where the app is used. It does not automatically synchronize across devices or users. Export JSON backups regularly, especially before clearing browser data or moving to another device. Imported JSON replaces the active team's schedule; review the selected team and practice before continuing.
