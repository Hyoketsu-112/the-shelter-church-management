# The Shelter Junior Church Management System — Development Roadmap

## Product goal
A secure, multi-location system for managing children, families, classes, attendance, first-time visitors and ministry follow-up.

## Phase 1 — Production foundation
- [x] Child, guardian and class records
- [x] Multi-location structure
- [x] Role-based access and RLS
- [x] Attendance foundation
- [ ] Consolidate legacy migration numbering before a fresh production bootstrap
- [ ] Run role/security test matrix against a live Supabase project

## Phase 2 — Data import
Implemented in this feature branch:
- Official spreadsheet column format
- XLSX/CSV parsing
- Required-field validation
- Child creation
- Primary and secondary guardian creation and linking
- Duplicate child detection
- Import logging
- Staff notification after import

Next:
- [x] Downloadable Excel template directly from the Import page
- Per-row error export
- Class-name validation before confirmation

## Phase 3 — Notifications
Implemented foundation:
- Per-user in-app notification table
- Read/unread state
- Notification centre UI
- Import completion notifications
- Birthday notification generator

Next:
- Scheduled birthday job via Supabase Edge Function or cron
- First-time visitor notification trigger
- Repeated absence rules
- Email delivery provider
- Notification preferences UI

## Phase 4 — Ministry operations
- Faster class attendance
- Consecutive absence follow-up queue
- Child profile timeline
- Visitor conversion workflow
- Teacher-specific dashboards

## Phase 5 — Reporting
- Attendance by location/class/date
- Registration and class totals
- Upcoming birthdays
- Follow-up workload
- Excel exports

## Definition of done for production
1. All migrations apply cleanly from a new database.
2. Super Admin, Department Head, Teacher and Viewer permissions are tested.
3. A full real-world spreadsheet can be imported with an audit log.
4. Notification centre receives real events.
5. Sensitive child information is visible only to authorised staff.
