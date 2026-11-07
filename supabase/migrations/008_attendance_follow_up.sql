-- Phase B: smarter attendance and ministry follow-up.

create table if not exists public.follow_ups (
  id uuid primary key default uuid_generate_v4(),
  church_id uuid not null references public.churches(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  reason text not null default 'repeated_absence',
  status text not null default 'open' check (status in ('open','in_progress','completed','dismissed')),
  absence_count integer not null default 0,
  notes text,
  created_by uuid references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists follow_ups_church_status_idx on public.follow_ups(church_id,status,created_at desc);
create unique index if not exists follow_ups_one_open_absence_per_child
on public.follow_ups(child_id,reason)
where status in ('open','in_progress');

alter table public.follow_ups enable row level security;

create policy "staff view permitted follow ups" on public.follow_ups
for select to authenticated using (
  public.is_super_admin()
  or (public.is_admin() and church_id=public.get_my_church_id())
  or (public.get_my_role()='teacher' and public.teacher_can_access_child(child_id))
);

create policy "admins manage follow ups" on public.follow_ups
for all to authenticated using (
  public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id())
)
with check (
  public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id())
);

create or replace function public.save_attendance_session(
  p_church_id uuid,
  p_session_date date,
  p_records jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  r jsonb;
  target_child uuid;
  total_count integer := 0;
  present_count integer := 0;
  absent_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  for r in select value from jsonb_array_elements(p_records) loop
    target_child := (r->>'child_id')::uuid;

    if not exists (
      select 1 from public.children c
      where c.id=target_child and c.church_id=p_church_id
        and (public.is_super_admin() or public.is_admin() or public.teacher_can_access_child(c.id))
    ) then
      raise exception 'You do not have permission to mark attendance for this child';
    end if;

    insert into public.attendance(church_id,child_id,session_date,present,marked_by)
    values(p_church_id,target_child,p_session_date,coalesce((r->>'present')::boolean,false),auth.uid())
    on conflict(child_id,session_date) do update
      set present=excluded.present, marked_by=auth.uid();

    total_count := total_count + 1;
    if coalesce((r->>'present')::boolean,false) then present_count := present_count + 1;
    else absent_count := absent_count + 1; end if;
  end loop;

  perform public.refresh_repeated_absence_followups(p_church_id, p_session_date);

  return jsonb_build_object(
    'total',total_count,
    'present',present_count,
    'absent',absent_count
  );
end;
$$;
grant execute on function public.save_attendance_session(uuid,date,jsonb) to authenticated;

create or replace function public.refresh_repeated_absence_followups(
  p_church_id uuid,
  p_as_of date default current_date
) returns integer
language plpgsql security definer set search_path=public as $$
declare
  c record;
  streak integer;
  created_count integer := 0;
begin
  for c in
    select distinct a.child_id
    from public.attendance a
    where a.church_id=p_church_id
      and a.session_date<=p_as_of
      and a.present=false
  loop
    select count(*) into streak from (
      select present
      from public.attendance
      where child_id=c.child_id and session_date<=p_as_of
      order by session_date desc
      limit 3
    ) recent where present=false;

    if streak >= 3 then
      insert into public.follow_ups(church_id,child_id,reason,status,absence_count,created_by)
      values(p_church_id,c.child_id,'repeated_absence','open',streak,auth.uid())
      on conflict (child_id,reason) where status in ('open','in_progress')
      do update set absence_count=excluded.absence_count,updated_at=now();

      if not exists (
        select 1 from public.user_notifications n
        where n.church_id=p_church_id and n.entity_type='child' and n.entity_id=c.child_id
          and n.type='follow_up' and n.created_at::date=p_as_of
      ) then
        perform public.create_staff_notification(
          p_church_id,'follow_up','Attendance follow-up needed',
          (select first_name || ' ' || last_name from public.children where id=c.child_id)
          || ' has missed 3 recent recorded sessions and needs follow-up.',
          '/follow-ups','child',c.child_id
        );
        created_count := created_count + 1;
      end if;
    end if;
  end loop;
  return created_count;
end;
$$;

create or replace function public.get_attendance_summary(
  p_church_id uuid,
  p_days integer default 30
) returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'sessions', coalesce((select count(distinct session_date) from public.attendance where church_id=p_church_id and session_date>=current_date-p_days),0),
    'present', coalesce((select count(*) from public.attendance where church_id=p_church_id and session_date>=current_date-p_days and present),0),
    'absent', coalesce((select count(*) from public.attendance where church_id=p_church_id and session_date>=current_date-p_days and not present),0),
    'follow_ups', coalesce((select count(*) from public.follow_ups where church_id=p_church_id and status in ('open','in_progress')),0)
  )
$$;
grant execute on function public.get_attendance_summary(uuid,integer) to authenticated;
