# Children's Department Database — Complete Build Package

## What this package contains
This package starts from the project you uploaded and completes the current Phase 1 core:

- Login and authenticated dashboard
- Real child and class counts
- Upcoming and monthly birthdays
- Child list, search and status filter
- Add child
- Open and edit a child record
- Archive a child record
- Medical and special-needs notes
- Class assignment
- Guardian records and primary/pickup flags
- Class creation and deletion
- Supabase RLS helper functions and policies
- Database indexes and updated timestamps

## Apply the database migration
You already have `001_initial_schema.sql` and `002_classes_policy.sql` in your project history.

Run `supabase/migrations/003_security_and_features.sql` in the Supabase SQL Editor.

Important: this migration replaces the earlier policy setup with a complete church-scoped policy layer. If your original `002_classes_policy.sql` failed because helper functions did not exist yet, that is expected; `003` creates those helpers and the final policies.

## Copy the project
Replace your current project files with the files in this package, keeping your existing `.env.local` values.

Then run:

```powershell
npm install
npm run build
npm run dev
```

## Existing database prerequisite
Your authenticated Super Admin must have a matching row in `public.profiles`, with the role exactly `super_admin` and a valid `church_id`.
