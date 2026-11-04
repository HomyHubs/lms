# UI reference — target look for the LMS web app

> updated 2026-11-08 · 615cf06

The owner sent two dashboard screenshots in chat (2026-11-08) as the look to follow. The images are
not stored in the repo; this file records what to take from them. Slice-8 `/work-hours` is the first
page built in this style; the other pages get it in the UI-shell slice proposed below.

## Reference A — "EduNova AI ERP" teacher dashboard

| Area | What it shows | LMS equivalent |
| --- | --- | --- |
| Left sidebar | Logo; nav with icon + label (Dashboard, My Classes, Students, Attendance, Lesson Plans, Assignments, AI Quiz Builder, Results & Grades, Timetable, Homework, Communication, Library, Reports & Analytics, Leave Management, Fees, Settings); active item = blue filled pill; promo card "Meet Nova AI" at the bottom | Role-filtered nav replacing the HomePage link row |
| Top bar | Search with `⌘K` hint, notification bell with count badge, messages icon, avatar + name + role | Search later; bell for slice-9 notifications; avatar = phone + role |
| Greeting hero | "Good morning, Ms. Ria!" + "3 classes today and 12 pending tasks", primary button "View My Classes", illustration on the right, soft blue gradient | Per-role greeting with today's counts |
| AI cards | "AI Lesson Planner", "AI Content Generator" tiles with short text + action | Entry to `/ai-questions` (slice-4.5) |
| Stat cards (4) | Label, big number, small trend/sparkline, tinted square icon (Today's Classes 3, Student Count 128, Assignments to Grade 12, Pending Leave Requests 2) | `StatCard` (already in `WorkHoursPage`) |
| Quick links | Row of icon tiles (Attendance, Lesson Plan, Assignments, …) | Role shortcuts |
| Lists/charts | Upcoming activities with date badges; homework submissions donut (76%); student performance bars (class average vs top score); AI student risk alerts (High/Medium/Low pills); notifications list | Slice-7 report widgets; attendance/at-risk students |
| Right column | Month calendar, "Today's schedule" time blocks with a "Now" badge, smart reminders | Today's sessions (slice-6/8) |

## Reference B — "SRMS" student dashboard

| Area | What it shows | LMS equivalent |
| --- | --- | --- |
| Left sidebar | Solid blue sidebar (Dashboard, Profile, Courses, Results, Attendance, Exams, Timetable, Notice Board, Academic Calendar, Downloads, Feedback, Logout) | Student nav (`/exams`, `/attendance`, results) |
| Header | Hamburger, search, bell, avatar | Same top bar as A |
| Greeting banner | "Good Morning, Abhishek Verma!" + books illustration | Student greeting |
| Stat cards (5) | Tinted icon tiles: CGPA 8.45, Courses 6, Exams Completed 4, Overall Rank 12/120, Attendance 87% | Final score, classes, exams taken, rank, attendance rate (slice-7 data) |
| Recent results | Table with coloured grade pills | Exam attempts + classification pill |
| Notice board | List with megaphone icons | Slice-9 notifications |
| Academic calendar, quick access tiles | Small calendar, shortcut tiles | Sessions calendar, shortcuts |
| Performance overview | Donut 84% with legend Excellent / Good / Average / Needs improvement | Classification bands (slice-7: Giỏi/Khá/TB/Yếu) |
| Footer | Copyright line | App footer |

## Patterns to adopt

- **Page:** soft background `bg-slate-50`; content in white cards `rounded-xl border-slate-100 shadow-sm`, generous padding (`p-5`), grid gaps `gap-3..5`.
- **Colour roles** (name by role, not hue): `primary` blue (active nav, primary buttons, links), `success` emerald, `accent` violet, `warning` amber, `danger` rose. Tinted tile = `bg-<role>-50 text-<role>-600`.
- **Stat card:** label (xs, slate-500) → value (2xl semibold) → hint/trend (xs), tinted icon square top-right.
- **Status pills:** small rounded tinted badges for grades, risk levels, session status ("Bù"/"Thay" already used in `/work-hours`).
- **Hero:** gradient `from-blue-50 to-sky-50`, greeting + one primary action.
- **Tables:** header row slate-500, rows separated by `border-slate-100`.
- **Charts:** keep the slice-7 CSS bars/donut approach before adding a chart library.

## Proposed slice — UI shell (restyle every page)

Not in the MVP backlog yet; needs the owner's go-ahead.

1. `AppShell` layout: left sidebar (role-filtered nav, active pill, collapsible on mobile) + top bar (search placeholder, bell, avatar/role, logout); every protected route renders inside it.
2. Shared components in `src/components/ui/`: `Card`, `StatCard` (tone prop: primary/success/accent/warning/danger), `Input`/`Select`, `Badge`, `PageHeader`; move the local copies out of `WorkHoursPage`, `ReportsPage`, `AttendancePage`.
3. Role dashboards on `/`: Admin (branch stats, report shortcuts), Teacher (today's sessions, attendance to mark, teaching hours), Staff (check-in hero, timesheet), Student (scores, rank, attendance donut, upcoming exams) — replacing the health-check page (health becomes a small status chip).
4. Restyle existing pages inside the shell without behaviour changes; keep current tests green and add one shell render test per role.
