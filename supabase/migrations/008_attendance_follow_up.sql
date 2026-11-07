-- Phase B: attendance intelligence and ministry follow-up.

create table if not exists public.follow_up_cases (
  id uuid primary key default uuid_generate_v4(),
  church_id uuid not null references public.churches(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  reason text not null default 'repeated_absence',
  absence_count integer not null default 0,
  status text not null default 'open' check (status in ('open','in_progress','completed','dismissed')),
  notes text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(child_id, reason, status)
);
alter table public.follow_up_cases enable row level security;

create index if not exists follow_up_cases_church_status_idx
  on public.follow_up_cases(church_id,status,created_at desc);

create or replace function public.evaluate_attendance_follow_up(p_child_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_church uuid;
  v_name text;
  v_absences integer;
  v_exists boolean;
begin
  select church_id, first_name || ' ' || last_name into v_church, v_name
  from public.children where id=p_child_id;
  if v_church is null then return; end if;

  select count(*) into v_absences
  from (
    select present from public.attendance
    where child_id=p_child_id
    order by session_date desc
    limit 3
  ) recent
  where present=false;

  if v_absences >= 3 then
    select exists(select 1 from public.follow_up_cases
      where child_id=p_child_id and reason='repeated_absence'
      and status in ('open','in_progress')) into v_exists;

    if not v_exists then
      insert into public.follow_up_cases(church_id,child_id,reason,absence_count)
      values(v_church,p_child_id,'repeated_absence',v_absences);
      perform public.create_staff_notification(
        v_church,'follow_up','Child needs follow-up',
        v_name || ' has been absent for three recent recorded sessions.',
        '/follow-up','child',p_child_id
      );
    end if;
  end if;
end;
$$;

create or replace function public.after_attendance_saved()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.evaluate_attendance_follow_up(new.child_id);
  return new;
end;
$$;
drop trigger if exists attendance_follow_up_trigger on public.attendance;
create trigger attendance_follow_up_trigger
after insert or update of present, session_date on public.attendance
for each row execute function public.after_attendance_saved();

create or replace function public.touch_follow_up_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists follow_up_touch_updated_at on public.follow_up_cases;
create trigger follow_up_touch_updated_at before update on public.follow_up_cases
for each row execute function public.touch_follow_up_updated_at();

create policy "staff view follow up cases" on public.follow_up_cases for select to authenticated using (
  public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id()) or public.teacher_can_access_child(child_id)
);
create policy "admins manage follow up cases" on public.follow_up_cases for all to authenticated using (
  public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id())
) with check (
  public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id())
);
