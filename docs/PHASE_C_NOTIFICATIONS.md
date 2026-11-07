# Phase C notifications

Phase C adds a daily notification automation function, church-level event/channel/recipient preferences, repeat-safe in-app alerts, first-timer follow-up cases, and optional email delivery through Resend.

## Deploy

1. Apply migrations `010_phase_c_notification_automation.sql` after the existing migrations.
2. Deploy the `notification-automation` Supabase Edge Function.
3. In Supabase SQL Editor, run `supabase/scheduled-jobs/notification-automation.sql` after replacing the project URL and Supabase Secret API key placeholders. This stores the values in Vault and schedules the daily run for 01:00 Africa/Lagos time.
4. If email is enabled in a church's settings, set `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` as Edge Function secrets. The sender address must be verified with Resend. Staff need an email address on their Supabase Auth account; addresses are read through the Auth Admin API and are not copied into public profile records.

## What runs automatically

- Birthday notifications use each church's timezone and configured lead days. Each child/year/lead-day combination is deduplicated.
- First-time QR submissions create a visitor follow-up case and alert the selected staff roles.
- Attendance follow-up alerts are generated from the current three most recent recorded sessions and deduplicated by follow-up case.
- Email delivery is logged per notification, recipient, and channel. Failed deliveries can retry on the next daily run; successful deliveries are not resent.

To inspect scheduled run history, use Supabase Dashboard > Cron > `notification-automation-daily`. Email attempts and errors are in `notification_log`.
