# The Shelter Church Management System — Fast Setup

## What this package adds
- Four locations: The Shelter Anthony, The Shelter Okota, The Shelter Community, Excellent Church.
- Junior Church workspace using the Junior Church logo.
- Main Church workspace using the Main Shelter logo.
- Super Admin navigation across all locations.
- Main Church member database foundation.
- Administration pages for locations and users.

## Step 1: Run the database upgrade
Open Supabase Dashboard → SQL Editor and run:

`supabase/migrations/004_multi_location_main_church.sql`

This must run after migrations 001–003.

## Step 2: Super Admin accounts
Your two Super Admin users must exist in `auth.users`, then have rows in `profiles` with:
- `role = 'super_admin'`
- `is_active = true`
- any valid `church_id` (the role grants access to all locations)

Do not create a third Super Admin unless church leadership explicitly authorizes it.

## Step 3: Build locally
```powershell
npm install
npm run build
npm run dev
```

## Step 4: GitHub and Vercel
Do not commit `.env.local`.
Add these exact environment variables in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Then deploy.

## Important security note
Teachers remain restricted by their assigned `profiles.church_id`. Super Admins can read and manage all four locations. Junior Church children data and Main Church members data use separate tables.
