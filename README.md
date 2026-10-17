# SchoolDesk 2.0

An original, standalone teacher workspace inspired by everyday school workflows. SchoolDesk is independent of SEQTA and Tes.

This is a working **single-user prototype** using fictional student records. It runs on GitHub Pages without installation, a backend or API keys. Saved records stay in this browser; use JSON backups to move them to another browser or device.

## What changed in version 2

- Five colour schemes in Settings: Forest, Ocean, Plum, Slate and Terracotta.
- Configurable school years, terms, school holiday ranges and public holidays.
- A period-based timetable: Homeroom, Period 1, Period 2, Recess, Period 3, Period 4, Lunch, Period 5, Period 6. Start/end times are editable in Settings.
- Holiday columns show **School Holidays** or **Public Holiday** instead of classes.
- **Special Timetable** replaces one specific date, keeping recurring classes and other dates unchanged.
- Clicking a timetabled class opens **Attendance**, **Marksbook** or **Lesson Plan** for that class/date.
- Term attendance grids generated from the timetable, with icon-based marking and student-screen attendance overrides.
- Full-year marksbooks with a score/percentage pair for every assessment, followed by overall percentage and grade.
- Daily and weekly lesson-planner views with an entry for every timetabled class session.
- Automatic upgrades from version 1, with existing student records, results, notes and saved plans retained.

## Run locally

Open `index.html` in a modern browser. For consistent browser storage, use Python 3 to serve this folder:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. On Windows, `py -m http.server 8000` may be appropriate. No `npm install` or build step is needed to run the app.

## GitHub Pages

Keep `index.html`, `app.js`, `core.js`, `legacy.js`, `styles.css` and `assets/` at the repository root. In **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/(root)**. Keep the included `.nojekyll` file.

For this repository, the expected project URL is <https://lukey70.github.io/SchoolDesk/> **after Pages is enabled and deployment succeeds**. Committing the source alone does not enable Pages.

Official documentation: [Configure a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Set up your calendar first

Open **Settings & school calendar**:

1. Choose a colour scheme and update the school/staff display details.
2. Edit or add **School years**, then define **School terms** inside each year.
3. Add **School Holidays** or **Public Holiday** date ranges where needed. Both start and end dates are inclusive.
4. Adjust the nine period times. Periods must remain in order and cannot overlap; recess and lunch remain breaks.
5. Add recurring classes from the timetable. Only one class can occupy each teaching period in this teacher's timetable.

**The pre-filled dates are editable demonstration dates, not a verified official school calendar.** Configure your school's dates before relying on them.

Dates outside a school year have no classes. Weekends have no classes. Dates inside a school year but outside its terms are automatically School Holidays. Explicit holidays can close dates inside a term; Public Holiday takes precedence over School Holidays when they overlap. Week numbers are calendar weeks starting on Monday, with the week containing the term start treated as Week 1.

### Special Timetable

Use **Settings → Special Timetable** or the timetable's **Special Timetable** button. Select a date, enter a label, then choose a class or school event for each teaching period. You can copy the regular weekday's classes as a starting point.

- Only the selected date changes.
- An empty period has no class that day. An entirely empty Special Timetable cancels all classes for that date.
- School events can have a title and room without a class roster. They appear on the timetable but do not create a class attendance roll or lesson-plan entry.
- School/public holidays, weekends and dates outside terms still take precedence over special sessions.
- Remove the special date to return that day to its regular timetable.

## Attendance

Choose a **class** and **term**. Students appear down the left, with timetabled class sessions across the columns. Headers show the day, period, date, term and week. Holiday closures do not create attendance columns; Special Timetable sessions replace that day's normal columns.

| Action | Result |
| --- | --- |
| Click an unmarked square | Blue tick: Present |
| Click Present | Red cross: Absent |
| Click Absent again | Present |
| Shift-click an editable square | Blue tick with a green L: Late |
| Alt-click an editable square | Clear the mark |
| Hover or focus an icon | Attendance name via tooltip/accessibility label |

Choose **Save attendance** to persist edits. You can mark individual students without completing every square. Unsaved changes prompt before navigating away.

Click a column header, or use the date/period controls, to select a lesson. **Mark selected lesson present** fills current active class members for that lesson and skips protected entries.

### Student-screen attendance types

Open a student profile and choose **Manage student attendance**. Set a start/end date and choose all-day coverage (leave every period unchecked) or specific periods. Overlapping records for the same student, dates and periods are rejected.

Supported types, with distinct icons:

- Alternate programme
- Camp
- Excursion
- Late/Medical
- Medical
- Music lesson
- Sick bay
- Suspended (External)
- Suspended (Internal)

These records override class marks for their date/period range and are **read-only in the class attendance grid**, including during Shift-click or bulk marking. Edit or remove them from the student screen. Removing an override reveals any underlying saved teacher mark.

The overview/profile attendance rate uses Present + Late divided by all saved marks, including legacy records. It is a simple demonstration statistic, not a jurisdiction-specific attendance return. Other attendance types are not automatically treated as Present for that statistic.

## Yearly marksbook

Choose a **class** and **school year**. All assignments belonging to that class/year appear side by side, including tasks due earlier or later in the year. Each task has:

- An editable score out of its maximum.
- An automatically calculated percentage beside it.

The final two columns always show **Overall Percentage** and **Overall Grade**. Click an assessment heading to edit its title, due date, maximum, year or description. A maximum cannot be reduced below an existing recorded score.

**Overall calculation:** sum of earned marks divided by sum of maximum marks for tasks with a recorded score. Blank tasks are excluded. A zero is a result and is included. This is a points-based calculation; there are no separate assessment weightings.

| Grade | Unrounded percentage |
| --- | --- |
| A | 75% and above |
| B | 65% to below 75% |
| C | 50% to below 65% |
| D | 35% to below 50% |
| E | 15% to below 35% |
| F | Below 15% |

Displayed percentages use up to two decimals. Grades use the unrounded percentage. Choose **Save marks** to persist edits. CSV export includes the selected year's saved marks, percentages and overall results, including historical results for students no longer on the active roster.

## Lesson planner

Switch between **Daily** and **Weekly**, choose a date, and optionally filter by class. Every actual timetabled class session has its own plan entry, even before you write the plan. Open an entry to add its title, learning intention, activities and resources.

Plans are linked to a date, class and period. Two sessions of the same class on one day have separate entries. Timetable links open the relevant saved plan or a new plan for that session. New plans must belong to a timetabled class session, and duplicate plans for one session are prevented.

The planner respects term dates, holidays and Special Timetable changes. Previously saved plans remain available in **Saved plans outside the current timetable** for their date range if their session is removed or closed. You can edit, duplicate or remove saved plans.

## Existing features retained

Student search/filtering, caregiver details, support notes, archiving/reactivation, connected profiles, class roster editing, pastoral records and follow-ups, local notices, JSON backup/restore, CSV exports and responsive navigation.

## Upgrading from version 1

The existing storage key, `schooldesk.v1`, is deliberately retained. Old workspaces are read and validated, then upgraded in memory. The next successful save stores version 2; original saved bytes remain untouched until then. Version 1 JSON backups also upgrade on restore.

- Old free-time timetable sessions map to the nearest available teaching period on the same weekday. **Review period assignments and times after upgrading.**
- A previous morning/afternoon roll maps to a dated period only when the match is unambiguous and all statuses are supported. Otherwise it remains a retained legacy roll, visible in attendance summaries and CSV exports.
- Previous lesson plans link to matching dated class sessions where possible. Additional or unmatched plans are retained outside the timetable.
- Grades now follow the new thresholds; stored raw scores are preserved.
- Saved attendance for sessions removed by a later timetable/calendar edit is retained and exported, even though those sessions no longer appear as current term columns.
- If upgrade fails, the original data is preserved, editing is blocked and a warning is shown. **Export original saved data** in Settings before investigating or resetting.

## Storage and limitations

Records remain in `localStorage`, scoped to the browser profile and site origin. Multiple SchoolDesk copies on the same origin share the same storage key. Switching browser/device/domain or moving from a local file to GitHub Pages requires backup/restore.

Downloads are plain JSON/CSV files. Restoring validates records and relationships and asks before replacing the workspace. Invalid imports and failed writes leave previous saved data intact. If another tab changes or clears the workspace, saving in the older tab is blocked until you reload or explicitly restore/reset.

This is a fictional-data prototype with **no staff authentication, permissions or shared database**. Use approved hosting, server-backed storage, access controls and secure data handling before a real-school rollout. Messaging, parent/student portals, integrations and official reporting compliance are not included.

## Source and verification

| File | Purpose |
| --- | --- |
| `index.html` | Entry point and accessible page shell |
| `styles.css` | Themes, responsive layouts, grids and print styles |
| `app.js` | Screens, forms, navigation and interaction handling |
| `core.js` | Calendar/session logic, grades, validation, migration and storage |
| `legacy.js` | Version 1 reader and demo generator for compatible upgrades |
| `assets/icon.svg` | Original SchoolDesk icon |
| `tests/` | Domain, migration and runtime workflow checks |

All assets are local and relative. Navigation uses hashes, so repository subpaths require no rewrite rules. There are no third-party scripts or network APIs.

Node.js 20 or newer:

```bash
npm test
npm run check
```

The suite contains **64 automated checks**, covering all requested workflows, migration, validation and persistence. Runtime tests use a minimal DOM harness, not a browser. **Visual browser/layout QA was unavailable in the build environment.** Check your target browser and print output before relying on them.
