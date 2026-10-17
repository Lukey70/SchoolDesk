# SchoolDesk

An original, standalone teacher workspace inspired by the kinds of daily workflows found in SEQTA Teach. SchoolDesk is independent of SEQTA and Tes and does not reproduce their branding, source code or proprietary interface.

**This first version is a working single-user prototype.** It starts with 16 fictional students and four classes. It stores records in your browser, with JSON backup/restore and CSV exports. It has no staff login or shared database.

## Start here

1. Extract the ZIP.
2. Open the `schooldesk` folder.
3. Double-click `index.html` to try it in a modern browser. If browser file restrictions prevent saving or loading, use the local server below or GitHub Pages.
4. Open **Settings & data** to change the school name and your display name.
5. Export a backup before clearing browser data or changing devices.

For more consistent local storage, serve the folder locally using Python 3:

```bash
cd schooldesk
python -m http.server 8000
```

Open <http://localhost:8000>. On Windows, `py -m http.server 8000` may be the appropriate command. No npm install, API key or build step is needed to run the app.

## Upload to GitHub and publish

1. Create a new repository, for example `schooldesk`.
2. Extract the ZIP first. In the repository, choose **Add file → Upload files**.
3. Upload the **contents inside** the extracted `schooldesk` folder. Include the `assets` folder. `index.html` must appear at the top level of the repository, alongside `app.js`, `core.js` and `styles.css`. Uploading the ZIP itself does not publish the app.
4. Commit the files to the `main` branch.
5. Go to **Settings → Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Choose branch **main**, folder **/(root)**, and save.
8. When GitHub finishes publishing, open the URL shown there. A project repository normally uses `https://YOUR-USERNAME.github.io/schooldesk/`.

A public repository is the simplest option when using GitHub Free; private-repository Pages availability depends on your plan. The included `.nojekyll` file disables Jekyll processing. If your uploader hides files beginning with a dot, you can add an empty `.nojekyll` file using GitHub's **Add file → Create new file**. The plain app assets also work without a build.

Official guidance:

- [Configure a GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Create a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

## What works

| Area | Included behaviour |
| --- | --- |
| Overview | Connected student counts, saved attendance summary, upcoming assessments, scheduled classes, notices and open follow-ups |
| Students | Search and filter, create and edit records, caregiver details, support notes, archive/reactivate, profile history and filtered CSV export |
| My classes | Create/edit classes, select student rosters, choose colours, access rolls and lesson plans |
| Attendance | Separate roll for each class, date and morning/afternoon session; Present/Absent/Late/Excused; comments; mark all present; explicit save; export all saved rolls |
| Lesson planner | Create, view, edit, duplicate and delete plans with learning intentions, lesson sequences and resources |
| Assessments | Create/edit/delete tasks, record decimal marks, calculate percentages/grades, keep zero distinct from unmarked, save and export results |
| Timetable | Edit a recurring Monday–Friday timetable, prevent overlapping sessions, browse weeks and print |
| Pastoral care | Create/edit records, link them to student profiles, search/filter, close and reopen follow-ups |
| Noticeboard | Create, edit and delete local notices by category |
| Settings | School/staff display preferences, JSON backup/restore, explicit demo reset |

Student profiles connect class membership, attendance, assessment results and pastoral history. Archiving a student removes them from new rolls/current marksbooks while retaining earlier records. Removing someone from a class does not erase historical marks or saved rolls.

### Attendance and marks

- Choose a status for **every student** before saving a roll.
- A previously saved roll keeps its original student roster. New students added later appear on newly created rolls.
- Changing the class/date/session opens a different roll. Reopen a saved roll by selecting those same values.
- **Present + Late** divided by all recorded statuses gives the displayed attendance rate. This is a simple demonstration calculation, not a jurisdiction-specific attendance return.
- Mark entry is saved only when you choose **Save marks**. Clearing a mark makes it unmarked; a saved zero is a result.
- Default grades: A ≥ 80%, B ≥ 65%, C ≥ 50%, D ≥ 35%, E < 35%. The thresholds live in `core.js` and are not an official school grading policy.
- CSV exports contain saved data. Save any draft marks before exporting. Student CSV exports follow your current directory filters.

### Storage and backups

- Records use `localStorage` under key `schooldesk.v1`, scoped to this browser profile and site origin. Multiple copies hosted under the same origin share that key.
- Refreshing the same site keeps saved changes. A different browser, private window, domain or device starts separately.
- Opening the app from a local file and opening its GitHub Pages URL use different storage. Move your records with **Download backup → Restore backup**.
- Backups include the complete workspace. Restore validates records and relationships, then asks before replacing current data.
- Corrupt saved data is preserved until you explicitly restore/reset. Storage-write failures do not silently discard the previous saved state.
- If another tab modifies the workspace, saving is blocked in the older tab until you reload or explicitly restore/reset.
- No app data is sent to a server. Clearing browser storage deletes local records; keep backups somewhere safe. Downloaded backups and CSV files are plain text, so handle them accordingly.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | App entry point and accessible page shell |
| `styles.css` | Original responsive layout, theme and print styles |
| `app.js` | Screens, forms, navigation and user interactions |
| `core.js` | Demo records, storage, schema checks, calendar helpers, grades and CSV generation |
| `assets/icon.svg` | Original SchoolDesk icon |
| `tests/` | Dependency-free domain and runtime integration checks |
| `.nojekyll` | Static GitHub Pages hosting |
| `package.json` | Optional Node test and syntax-check scripts |

All asset links are relative, so repository subpaths work. Navigation uses URL hashes and needs no server redirects. The app uses system fonts, local assets and no third-party scripts or network APIs.

## Developer checks

Node.js 20 or newer:

```bash
npm test
npm run check
```

There are 26 automated tests covering connected demo data, dates, grade boundaries, CSV escaping, import validation, storage behaviour, workflow rendering and form submissions. The runtime integration tests use a small DOM harness. They are **not** a real-browser layout/accessibility test. Visual browser QA was unavailable in the creation environment.

Before publishing or extending, manually check desktop/mobile navigation, search, a new student, roster edits, a saved roll and reload, zero/blank marks, timetable edits, and JSON backup/restore in your target browser. Check print output before relying on it.

## Taking it beyond a prototype

For a shared school system, the next stage is a server-backed database and staff authentication with role-based permissions. Add server-side validation, audit history, approved data retention, secure backups, and access controls before using real student or family information. Browser-only storage and a public static site are not a suitable production student-record system.

Messaging, parent/student portals, file uploads, integrations, reporting compliance, holiday calendars and rotating timetable cycles are not included in this version.
