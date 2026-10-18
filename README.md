# SchoolDesk 4.0

An original, standalone teacher workspace inspired by everyday school workflows. SchoolDesk is independent of SEQTA and Tes.

This is a working **single-user prototype** using fictional student records. It runs on GitHub Pages without installation, a backend or API keys. Saved records stay in this browser; use JSON backups to move them to another browser or device.

## What changed in version 4

- Homegroup dropdowns now use **Jarrah (green), Tuart (blue), Wattle (yellow) and Redgum (red)**, with labelled colour badges.
- New student/class entry and filters offer **Year 7, Year 8, Year 9, Year 10, Year 11 and Year 12**. Bulk entry uses the same dropdowns; CSV imports validate the same values.
- Classes automatically appear in **Archived** from the first day after their selected school year's end date. Earlier attendance, marks and plans remain accessible.
- Add **Excused** as a protected student-screen attendance type, shown as a grey circle with a white E. Hover/focus identifies it as Excused.
- Attendance no longer labels withdrawn students as Archived beside their names. Historical rows and locked grey Not enrolled cells remain.
- Version 3 workspaces upgrade without reassigning earlier homegroup/year values or losing records and drafts.

## What changed in version 3

- Forty visible class-colour swatches, with the whole timetable class block coloured.
- Class archive/restore with effective dates and retained marks, attendance and plans.
- Class school-year links and dated school/class enrolments. Attendance outside enrolment dates is grey, locked and excluded from calculations.
- Preferred names displayed as **First (Preferred) Last** throughout the workspace and reports.
- Bulk Add Students, CSV/Excel student import with preview, and automatic, immutable student numbers.
- Roster filters by year level, homegroup, active/archived status, name or number; selected students remain selected when filters change.
- Dated recurring timetable versions preserve earlier weeks. Class default rooms pre-fill timetable forms until manually overridden.
- Sharp, consistently sized attendance icons and shared attendance counting rules for summaries and exports.
- Assessment statuses, optional weightings, live class-average percentages and previewed Excel mark pasting.
- Expanded student progress, enrolment and attendance histories, plus existing pastoral follow-ups.
- Recoverable form/attendance/marks drafts, unsaved-change warnings, undo/redo and saved change history.
- Automatic upgrades from versions 1 and 2. All version 2 calendar, timetable, attendance, marksbook and daily/weekly planner features remain available.

## Run locally

Open `index.html` in a modern browser. For consistent browser storage, use Python 3 to serve this folder:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. On Windows, `py -m http.server 8000` may be appropriate. No `npm install` or build step is needed to run the app.

## GitHub Pages

Keep `index.html`, `app.js`, `core.js`, `core-v2.js`, `legacy.js`, `styles.css` and `assets/` at the repository root. In **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/(root)**. Keep the included `.nojekyll` file.

For this repository, the expected project URL is <https://lukey70.github.io/SchoolDesk/> **after Pages is enabled and deployment succeeds**. Committing the source alone does not enable Pages.

Official documentation: [Configure a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Set up your calendar first

Open **Settings & school calendar**:

1. Choose a colour scheme and update the school/staff display details.
2. Edit or add **School years**, then define **School terms** inside each year.
3. Add **School Holidays** or **Public Holiday** date ranges where needed. Both start and end dates are inclusive.
4. Adjust the nine period times. Periods must remain in order and cannot overlap; recess and lunch remain breaks.
5. Create classes with a school year and dated roster, then add recurring classes from the timetable. Only one class can occupy each teaching period in this teacher's timetable.

Recurring timetable additions, edits and removals ask for an **Effective from** date. Earlier dates retain their previous timetable. If a later version is already scheduled, the change applies only until that version begins. Open a class in the relevant timetable week to edit its recurring entry. Timetable forms pre-fill the class default room; changing the class updates that default until you manually edit the room.

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

Click a column header, or use the date/period controls, to select a lesson. **Mark selected lesson present** fills students enrolled in the class on that lesson date and skips protected entries.

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
- Excused (grey circle with a white E)

These records override class marks for their date/period range and are **read-only in the class attendance grid**, including during Shift-click or bulk marking. Edit or remove them from the student screen. Removing an override reveals any underlying saved teacher mark.

**Settings → Attendance counting rules** controls whether each status counts as Attended, Absent or Exclude. Defaults: Present/Late count as attended; other statuses, including Excused, count as absent. You can change Excused to Exclude or Attended in these settings if that matches your school’s counting rules. The rate is attended entries ÷ included entries. Excluded statuses and dates outside school/class enrolment do not enter the denominator. The overview and student profile use saved entries through today; the attendance CSV includes all saved dates, including future entries if any were explicitly entered.

Student-screen overrides are included for actual scheduled lessons even if a teacher has not saved a roll, and replace underlying marks once. Unmarked squares do not count. Saved historical and ambiguous legacy rolls are retained; legacy Excused entries count as absent by default. All reports use the same resolved entries. This is a demonstration statistic, not an official attendance return.

Cells before a student's first class day, from their first day out, or outside school enrolment are grey, labelled **Not enrolled**, and cannot be marked. Historical students remain visible across their term so previous attendance remains accessible.

## Yearly marksbook

Choose a **class** and **school year**. All assignments belonging to that class/year appear side by side, including tasks due earlier or later in the year. Each task has:

- An editable score out of its maximum, with a status selector.
- An automatically calculated percentage beside it.
- A live **Class Average** percentage at the bottom of the assessment column.

The final two columns always show **Overall Percentage** and **Overall Grade**. Click an assessment heading to edit its title, due date, maximum, year or description. A maximum cannot be reduced below an existing recorded score.

| Assessment status | Calculation |
| --- | --- |
| Scored | Recorded score, including zero, is included |
| Not marked | Excluded until marked |
| Not submitted | Counts as zero out of the task maximum |
| Exempt | Excluded |

The default overall calculation uses total earned marks ÷ total maximum marks for included tasks. **Weightings** can switch a class/year to weighted mode: task weights must total 100%. Overall then uses each task percentage multiplied by its weight, normalised across included tasks. Unmarked/exempt tasks and zero-weight tasks are excluded. Class averages include scored zeros and Not submitted, and exclude Not marked/Exempt. Withdrawn students' results remain available in the yearly marksbook.

Use **Paste marks from Excel** to paste one score per row in the displayed student order, or two columns containing a unique student number/name and score. Blank rows in a one-column paste keep their student position. Recognised status text can replace a score. The preview validates every row before applying it to the marksbook draft; **Save marks** is still required. Use student numbers when names are duplicated.

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

## Students and dated classes

Student and class year-level dropdowns contain Year 7 through Year 12. Homegroup dropdowns contain the four options below; their names remain visible alongside colour so colour alone is never required to identify a homegroup.

| Homegroup | Colour |
| --- | --- |
| Jarrah | Green |
| Tuart | Blue |
| Wattle | Yellow |
| Redgum | Red |

**Student directory → Bulk Add Students** accepts multiple rows of first name, last name, year level and homegroup. Add rows as needed; empty rows are ignored. A common first school date applies to the batch. **Paste / Import student list** accepts CSV or tab-separated Excel text, or a CSV/TSV file, and shows a preview before adding anyone. Optional Preferred name headers are supported. Supplied student-number columns are ignored. A batch accepts up to 500 students and saves atomically. Use years `7`–`12` (or labels such as `Year 7`) and one of the approved homegroup names. Matching is case-insensitive on import; saved values use the standard spelling. A row with an unknown year or homegroup rejects the entire batch before saving.

New student numbers use `SD000001`, `SD000002`, etc., skipping existing numbers. Numbers are read-only and unchanged by student edits. Existing numbers are preserved on upgrade. Duplicate names are permitted; imports flag names matching existing students for review. No automatic student merges are performed.

In a class, choose its school year, default room and colour swatch. Filter the roster without losing checked students. Each selected student has a first enrolled date and an optional **first day no longer enrolled**. Start dates are inclusive; end dates are exclusive. Unchecking a student ends their current membership on the roster effective date and preserves earlier history. A return after an ended membership creates a new interval. An explicitly entered end date never silently re-enrols the student.

**Archive student** asks for the first day they are no longer enrolled in school or any class. That day and later dates are excluded; earlier records remain intact. **Re-enrol student** opens a new school enrolment; add them to the required class rosters separately. **Archive class** stops its sessions from the chosen date; use the Archived class filter to restore it. Classes also archive automatically the day after their selected school year ends, even without a manual archive action. The year end date in Settings controls this boundary. Status is calculated from the date, so it also takes effect when the app is reopened after a break; an open tab checks the date every minute and on returning to the tab. Open/unsaved forms are protected while its list refresh waits.

Archived classes remain selectable for historical attendance and marks. Use the term/year selectors to open the period you need. An automatically archived class shows **Change school year**, rather than a restore action that would bypass its expired year. Manual restoration remains available within a valid school year. Changing a school-year link can change which dates are available for that class; retain separate classes for separate years when their histories should stay distinct.

Student profiles combine contact/support details, school and class enrolments, assessment status/results, attendance history and pastoral follow-ups. The recent attendance timeline shows up to 100 resolved entries; CSV export includes all resolved entries.

## Drafts, history and recovery

Form changes are saved separately as recoverable drafts. Attendance and marks drafts also retain their selected class/date/term/year. Leaving a screen, closing a dirty dialog or closing the tab warns about unsaved changes. Drafts do not change saved records or exported marks until explicitly saved.

Use **Recover drafts**, or reopen the same form and choose **Recover draft**. Review recovered values before saving. Student import and Excel mark previews also retain their input forms. Successfully saving clears that draft. Reset/backup restore clears unfinished drafts.

**Undo** and **Redo** cover the latest 20 saved changes in the current browser session. A new save clears redo history. Student-number counters do not go backwards when undoing. The latest 200 saved changes, including undo/redo, persist in **Change history**. Each entry includes the display profile, time, changed paths and shortened before/after values; large changes are limited to 100 details. This is a local change log, not a verified staff audit trail. Drafts remain browser-local and are not included in JSON backups.

## Upgrading existing workspaces

The existing storage key, `schooldesk.v1`, is retained. Version 1, 2 and 3 records are validated and upgraded in memory. The next successful save stores version 4; original saved bytes remain untouched until then. Old JSON backups also upgrade on restore.

- Existing student numbers, scores, attendance, notes, plans, timetable history, enrolments and saved change history are preserved. Recoverable drafts continue to use their existing browser key.
- Old homegroups and year levels outside the new options remain unchanged for review. Directory/roster filters include **Previous homegroup values** and **Previous year values** when needed. Editing one of those student records asks you to explicitly choose the approved values; the upgrade never guesses a student's homegroup.
- Version 3 class school-year links are retained, and linked classes whose year has ended now appear under Archived. No record deletion or permanent archive-period rewrite is needed.
- Excused is added to attendance settings. Version 1/2/3 JSON backups remain supported, and version 4 backups include the new attendance type.
- For version 1/2 upgrades, preferred names initially remain blank. School/class enrolments initially begin at the earliest configured school-year start. Previously archived students end on the upgrade date because old versions did not record a withdrawal date. Review these dates after upgrade.
- Version 1/2 classes retain an unlinked school year covering all configured years to preserve their earlier behaviour. Assign a specific school year when editing them so automatic end-of-year archiving can apply. New classes require a school year.
- The existing recurring timetable becomes the initial historical version. Earlier edits made before v3 cannot be reconstructed.
- Version 1 free-time sessions map to available named periods; ambiguous rolls remain retained legacy records. Review period assignments and times after upgrading.
- Previously saved plans survive removed sessions and appear under **Saved plans outside the current timetable**.
- If upgrade fails, the original data is preserved, editing is blocked and a warning is shown. Export original saved data in Settings before investigating or resetting.

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
| `core.js` | Version 4 homegroups, enrolments, class lifecycle, attendance, grades, validation and storage |
| `core-v2.js` | Version 2 calendar/session logic and upgrade bridge |
| `legacy.js` | Version 1 reader and demo generator for compatible upgrades |
| `assets/icon.svg` | Original SchoolDesk icon |
| `tests/` | Domain, migration and runtime workflow checks |

All assets are local and relative. Navigation uses hashes, so repository subpaths require no rewrite rules. There are no third-party scripts or network APIs.

Node.js 20 or newer:

```bash
npm test
npm run check
```

The suite contains **151 automated checks**, covering all requested workflows, migration, validation and persistence. Runtime tests use a minimal DOM harness, not a browser. **Visual browser/layout QA was unavailable in the build environment.** Check your target browser and print output before relying on them.

