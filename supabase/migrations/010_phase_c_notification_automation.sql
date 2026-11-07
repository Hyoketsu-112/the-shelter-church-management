-- Phase C: preferences, idempotent notifications, visitor follow-up and automation.
alter table public.notification_settings
  add column if not exists enabled_types text[] not null default '{birthday,visitor,follow_up}',
  add column if not exists recipient_roles text[] not null default '{super_admin,dept_head}';

alter table public.user_notifications
  add column if not exists dedupe_key text,
  add column if not exists in_app_enabled boolean not null default true;
create unique index if not exists user_notifications_recipient_dedupe_idx
  on public.user_notifications(recipient_id, dedupe_key)
  where dedupe_key is not null;

alter table public.notification_log
  add column if not exists notification_id uuid references public.user_notifications(id) on delete cascade,
  add column if not exists recipient_id uuid references public.profiles(id) on delete cascade;
create unique index if not exists notification_log_email_delivery_idx
  on public.notification_log(notification_id, recipient_id, channel);

alter table public.follow_ups alter column child_id drop not null;
alter table public.follow_ups
  add column if not exists visitor_submission_id uuid references public.visitor_submissions(id) on delete cascade;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='follow_ups_subject_check') then
    alter table public.follow_ups add constraint follow_ups_subject_check
      check ((child_id is not null)::int + (visitor_submission_id is not null)::int = 1);
  end if;
end $$;
create unique index if not exists follow_ups_one_visitor_case
  on public.follow_ups(visitor_submission_id)
  where visitor_submission_id is not null and status in ('open','in_progress');

-- Keep the seven-argument API used by the app while applying type, role,
-- channel and deduplication preferences centrally.
drop function if exists public.create_staff_notification(uuid,text,text,text,text,text,uuid);

create or replace function public.create_staff_notification(
  p_church_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_href text,
  p_entity_type text,
  p_entity_id uuid,
  p_dedupe_key text
) returns void
language plpgsql security definer set search_path=public as $$
declare
  setting public.notification_settings%rowtype;
  notification_key text;
begin
  select * into setting from public.notification_settings where church_id=p_church_id;
  if not found then
    setting.enabled_types := array['birthday','visitor','follow_up','import'];
    setting.recipient_roles := array['super_admin','dept_head'];
    setting.channels := array['in_app'];
  end if;
  if not (p_type = any(coalesce(setting.enabled_types, array[]::text[])))
     or not (coalesce(setting.channels, array[]::text[]) && array['in_app','email']) then
    return;
  end if;

  notification_key := coalesce(p_dedupe_key,
    p_type || ':' || coalesce(p_entity_type,'general') || ':' ||
    coalesce(p_entity_id::text, (now() at time zone 'Africa/Lagos')::date::text));

  insert into public.user_notifications
    (church_id,recipient_id,type,title,message,href,entity_type,entity_id,dedupe_key,in_app_enabled)
  select p_church_id, pr.id, p_type, p_title, p_message, p_href,
         p_entity_type, p_entity_id, notification_key,
         'in_app' = any(coalesce(setting.channels, array['in_app']::text[]))
  from public.profiles pr
  where pr.church_id=p_church_id and pr.is_active
    and pr.role = any(coalesce(setting.recipient_roles, array['super_admin','dept_head']::text[]))
  on conflict (recipient_id,dedupe_key) where dedupe_key is not null do nothing;
end;
$$;
revoke all on function public.create_staff_notification(uuid,text,text,text,text,text,uuid,text) from public, anon, authenticated;

create or replace function public.create_staff_notification(
  p_church_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_href text default null,
  p_entity_type text default null,
  p_entity_id uuid default null
) returns void
language sql security definer set search_path=public as $$
  select public.create_staff_notification(
    p_church_id,p_type,p_title,p_message,p_href,p_entity_type,p_entity_id,null
  );
$$;
revoke all on function public.create_staff_notification(uuid,text,text,text,text,text,uuid) from public, anon, authenticated;

-- First-timer submissions immediately create an actionable visitor follow-up.
create or replace function public.notify_new_visitor()
returns trigger language plpgsql security definer set search_path=public as $$
declare case_id uuid;
begin
  insert into public.follow_ups(church_id,child_id,visitor_submission_id,reason,status,absence_count)
  values(new.church_id,null,new.id,'first_timer','open',0)
  on conflict (visitor_submission_id) where status in ('open','in_progress')
    do update set updated_at=now()
  returning id into case_id;

  perform public.create_staff_notification(
    new.church_id,'visitor','New first-time visitor',
    new.full_name || ' submitted a Junior Church first-time registration.',
    '/follow-ups','visitor',new.id,'visitor:' || new.id::text
  );
  return new;
end;
$$;

-- Rebuild the repeated-absence evaluator so each open case creates one alert.
create or replace function public.refresh_repeated_absence_followups(
  p_church_id uuid,
  p_as_of date default current_date
) returns integer
language plpgsql security definer set search_path=public as $$
declare
  c record;
  streak integer;
  case_id uuid;
  created_count integer := 0;
begin
  for c in
    select distinct a.child_id
    from public.attendance a
    where a.church_id=p_church_id and a.session_date<=p_as_of and a.present=false
  loop
    select count(*) into streak from (
      select present from public.attendance
      where child_id=c.child_id and church_id=p_church_id and session_date<=p_as_of
      order by session_date desc limit 3
    ) recent where present=false;

    if streak >= 3 then
      insert into public.follow_ups(church_id,child_id,reason,status,absence_count,created_by)
      values(p_church_id,c.child_id,'repeated_absence','open',streak,auth.uid())
      on conflict (child_id,reason) where status in ('open','in_progress')
      do update set absence_count=excluded.absence_count,updated_at=now()
      returning id into case_id;

      perform public.create_staff_notification(
        p_church_id,'follow_up','Attendance follow-up needed',
        (select first_name || ' ' || last_name from public.children where id=c.child_id)
        || ' has missed 3 recent recorded sessions and needs follow-up.',
        '/follow-ups','follow_up',case_id,'follow_up:' || case_id::text
      );
      created_count := created_count + 1;
    end if;
  end loop;
  return created_count;
end;
$$;

-- The daily Edge Function calls this single privileged RPC. Birthday keys are
-- scoped to the child, birthday year and lead time, so retries stay harmless.
create or replace function public.run_notification_automation()
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  church_row record;
  child_row record;
  church_today date;
  reminder_date date;
  birthday_year integer;
  days_before integer;
  generated integer := 0;
  followup_count integer := 0;
  age integer;
  body text;
begin
  for church_row in
    select c.id,c.timezone,ns.lead_days,ns.birthday_message_template
    from public.churches c
    left join public.notification_settings ns on ns.church_id=c.id
    where c.is_active
  loop
    church_today := (now() at time zone coalesce(nullif(church_row.timezone,''),'Africa/Lagos'))::date;
    for child_row in
      select ch.id,ch.church_id,ch.first_name,ch.last_name,ch.date_of_birth
      from public.children ch
      where ch.church_id=church_row.id and ch.archived_at is null and ch.status='active'
    loop
      foreach days_before in array coalesce(church_row.lead_days,array[7,1,0]) loop
        reminder_date := church_today + days_before;
        if extract(month from reminder_date)=extract(month from child_row.date_of_birth)
           and extract(day from reminder_date)=extract(day from child_row.date_of_birth) then
          birthday_year := extract(year from reminder_date)::integer;
          age := birthday_year - extract(year from child_row.date_of_birth)::integer;
          body := replace(
            replace(
              replace(coalesce(church_row.birthday_message_template,
                '{name} turns {age} in {days} days.'),
                '{name}',child_row.first_name || ' ' || child_row.last_name),
              '{age}',age::text),
            '{days}',days_before::text);
          perform public.create_staff_notification(
            child_row.church_id,'birthday',
            case when days_before=0 then 'Birthday today'
                 when days_before=1 then 'Birthday tomorrow'
                 else 'Birthday in ' || days_before || ' days' end,
            body,'/birthdays','child',child_row.id,
            'birthday:' || child_row.id::text || ':' || birthday_year::text || ':' || days_before::text
          );
          generated := generated + 1;
        end if;
      end loop;
    end loop;
    followup_count := followup_count + public.refresh_repeated_absence_followups(church_row.id,church_today);
  end loop;
  return jsonb_build_object('birthday_checks',generated,'attendance_cases_checked',followup_count);
end;
$$;
revoke all on function public.run_notification_automation() from public, anon, authenticated;
grant execute on function public.run_notification_automation() to service_role;
revoke all on function public.refresh_repeated_absence_followups(uuid,date) from public, anon, authenticated;
grant execute on function public.refresh_repeated_absence_followups(uuid,date) to service_role;
revoke all on function public.generate_birthday_notifications() from public, anon, authenticated;

-- Notification settings are intentionally managed only by church admins.
grant select,update on public.user_notifications to authenticated;
grant select,update on public.follow_ups to authenticated;
