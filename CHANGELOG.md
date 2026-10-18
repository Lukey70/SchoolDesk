# Changelog

## 4.0.0 — 18 October 2026

- Add fixed homegroup dropdowns: Jarrah (green), Tuart (blue), Wattle (yellow), Redgum (red), with labelled colour badges.
- Restrict new student/class entry, bulk entry and year filters to Year 7–12; validate approved values during CSV imports.
- Preserve earlier homegroup/year values during upgrade and expose review filters instead of silently reassigning students.
- Automatically archive classes the day after their selected school year ends, preserving historical attendance, marks and plans.
- Refresh date-dependent class status across midnight without discarding unsaved forms.
- Add protected student-screen Excused attendance, with a crisp grey-circle white-E SVG, hover/focus name and configurable counting rule.
- Remove the Archived label beside student names in attendance while retaining historical rows and locked grey cells outside enrolment.
- Add a validated v3-to-v4 upgrade; retain compatible v1/v2 import and existing draft keys.
- Verify 151 automated domain/runtime checks; visual browser QA remains unavailable in this build environment.

## 3.0.0 — 17 October 2026

- Add 40 visible class-colour swatches and colour entire timetable blocks.
- Add effective-date class archive/restore and school/class enrolment intervals.
- Lock and grey attendance outside enrolment; student withdrawal dates apply to all classes.
- Add preferred names, automatic immutable student numbers, bulk student entry and previewed CSV/Excel imports.
- Add roster filters that preserve selection and class default-room prefill with manual overrides.
- Preserve dated recurring timetable versions and link classes to school years.
- Unify saved attendance/override summaries and exports with configurable counting rules.
- Replace attendance icons with uniform 22px SVGs and accessible status names.
- Add Not marked, Not submitted, Exempt and Scored assessment statuses, optional weightings and live class averages.
- Add previewed Excel mark pasting, preserving blank row positions and rejecting ambiguous student matches.
- Expand student progress, attendance and enrolment history.
- Add recoverable form/marks/attendance drafts, unsaved-change warnings, session undo/redo and saved change history.
- Preserve existing version 1/2 records through validated upgrade and backup restore.
- Verify 120 domain/runtime checks; browser visual QA remains unavailable in the build environment.

## 2.0.0 — 17 October 2026

- Add workspace colour schemes, school years, terms, holiday ranges and editable period times.
- Replace free-time weekly lessons with the nine named timetable periods.
- Add one-day Special Timetable overrides and class shortcuts to attendance, marksbooks and lesson plans.
- Add timetable-generated term attendance grids with Present/Absent/Late clicks and tooltips.
- Add student-managed attendance types, period/date coverage, and protected class-grid entries.
- Add full-year marksbooks, live percentages, overall results and the requested A–F thresholds.
- Add daily/weekly planner views with a plan slot for every scheduled class.
- Retain version 1 records through validated upgrades and compatible backup restore.
- Expand automated verification to 64 checks.

## 1.0.0 — 17 October 2026

- Initial standalone teacher workspace with fictional students, class rosters, daily attendance, lesson plans, assessments, weekly timetable, pastoral care, notices and backup/restore.

