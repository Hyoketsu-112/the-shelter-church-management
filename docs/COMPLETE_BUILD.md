# Complete Build Checklist

## Supabase
1. Apply migrations 001 through 005 in order.
2. In Authentication, configure the production Site URL and allowed redirect URLs.
3. Create/confirm the two Super Admin profiles.
4. Run migration 005 before enabling public teacher registration.
5. Configure email delivery for production.
6. Configure scheduler/provider secrets before enabling live birthday messages.

## Application
Run `npm install` and then `npm run build`.

## Deployment
Push only source files; never commit `.env.local`. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel for each environment.

## Important
CSV/XLSX import and QR first-timer forms are included. First-timer submissions are intentionally stored in a review queue and do not directly expose or write into protected child records.
