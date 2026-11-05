# Children's Department Database

Phase 1 production foundation based on the supplied PRD and SDD.

## Start locally
1. Install Node.js.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and add Supabase credentials.
4. Run the SQL migration in your Supabase project.
5. Run `npm run dev`.

## Build order
- Database and RLS
- Authentication and roles
- Child and guardian records
- Classes and search
- Birthday dashboard and reminders
- CSV import and audit log
