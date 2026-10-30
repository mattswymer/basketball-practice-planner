# Basketball Practice Planner

A phone-first basketball practice planner and live coaching tool. Open `index.html` in a modern browser; there is no build step or server requirement.

## Practice planning
- Search, filter, sort, add, edit, remove, and reorder drills.
- Drag drills from the bank into a practice schedule. Drag a scheduled item back to the bank to remove only that scheduled copy.
- Every scheduled item shows its start/end time and allotted minutes.
- Set the gym start/end time and fit all activities proportionally to the available window.
- Create concurrent station rotations. Each rotation has one allotted duration; its stations run at the same time.
- Add drills to a station by choosing from its list or dragging from the bank onto a station card.

## Live practice
- Start a countdown for the first scheduled item.
- The active item is highlighted in the schedule. Instructions and equipment appear with each scheduled activity.
- Pause, resume, move backward/forward, and end the live session.

## Drill library
- 59 activities: 33 updated coach-provided activities and 26 additional activities retained from the historical practice workbook.
- Skill tags are editable checkbox selections and support filtering.
- Add custom drills and update a bank default from a scheduled copy.

## Equipment
- Select equipment options for a drill and set quantities.
- Add, rename, and remove equipment options in the editable catalog.
- The practice equipment view totals selected quantities across drills and station activities.
- Existing equipment descriptions are automatically mapped to matching catalog items when possible. Review quantities such as ball-per-player or team-wide equipment after the first load.

## Teams and groups
- Maintain separate teams, rosters, and practice schedules. Teams can be deleted; at least one team must remain.
- Save a roster to close team management.
- Randomize roster players into groups or assign them manually. Drag players between groups on desktop, or use each player's Move to selector on a phone.

## Export and storage
- Changes save in the current browser using localStorage. They do not automatically sync to other devices.
- Export/import a JSON backup containing teams, schedules, drills, and equipment catalog.
- PDF creates and downloads an actual `.pdf` file (not an HTML print page).

## Files
- `index.html` — app interface and dialogs
- `css_style.css` — phone-first layout and styles
- `js_app.js` — planner, persistence, timer, equipment, groups, and PDF generation
- `js_drills_db.js` — default skill tags and 59-drill library

## GitHub Pages
To publish, open repository **Settings → Pages**, select **Deploy from a branch**, choose `main` and the root folder, then save.
