-- Run in Supabase SQL Editor after deploying notification-automation.
-- Add or update these two values in Dashboard > Database > Vault first:
--   project_url
--   notification_function_key
-- Keep secret values out of this file. The function key must be a Supabase Secret API key.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;


do $$
begin
  if (select count(*) from vault.secrets where name in ('project_url','notification_function_key')) <> 2 then
    raise exception 'Add project_url and notification_function_key in Supabase Vault before scheduling this job.';
  end if;
end;
$$;
-- Supabase Cron uses UTC. 00:00 UTC is 01:00 in Africa/Lagos.
select cron.schedule(
  'notification-automation-daily',
  '0 0 * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='project_url')
        || '/functions/v1/notification-automation',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'apikey',(select decrypted_secret from vault.decrypted_secrets where name='notification_function_key')
      ),
      body := jsonb_build_object('scheduled_at',now()),
      timeout_milliseconds := 10000
    );
  $$
);
