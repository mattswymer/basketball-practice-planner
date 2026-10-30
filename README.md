# Basketball Practice Planner & Live Companion

A lightweight, browser-based practice planner for basketball coaches. It runs directly from GitHub Pages with no build tools or installation required.

## What it does
- **Practice planning:** Build a practice from the activity bank, edit activities, reorder them, and see start/end times.
- **Practice timing:** Fit activities proportionally to the available gym time, with whole-minute durations that add up to the practice window.
- **Live practice companion:** Run a countdown for each activity, move between activities, and keep the current activity's coaching notes visible.
- **Drill bank:** Search and filter drills, add custom activities, and keep equipment, skill tags, and coaching notes with each drill.
- **Teams and rosters:** Maintain team rosters, split players into balanced random groups, and retain the selected team.
- **Equipment checklist:** Combine equipment across the planned activities.
- **Import/export:** Save and restore practice plans as JSON or print a practice sheet to PDF.
- **Skill analytics:** View planned minutes by skill and activity when the Chart.js library is available.

## Run it
Open the app in a modern browser, or publish the repository with GitHub Pages:

1. Open **Settings → Pages** in the repository.
2. Select the **main** branch and the root folder.
3. Save. GitHub Pages will publish the app.

The app uses browser localStorage for its working data. Use **Export JSON** regularly to keep a portable backup. Data is stored in the browser and does not automatically sync between devices.

## Files
- index.html — app structure
- css_style.css — styles and responsive layout
- js_app.js — app behavior and local persistence
- js_drills_db.js — default activity bank and skill tags

## Notes
The default drill bank currently includes 10 starter activities. Add your own drills from the app's **New Drill** button.
