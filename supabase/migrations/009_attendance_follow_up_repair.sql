-- Keep attendance writes and follow-up evaluation in the same transaction.
-- A future-dated attendance session must not trigger a follow-up early.
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
  follow_up_count integer := 0;
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
    if coalesce((r->>'present')::boolean,false) then
      present_count := present_count + 1;
    else
      absent_count := absent_count + 1;
    end if;
  end loop;

  -- Evaluate all recorded sessions through today, while excluding future dates.
  select public.refresh_repeated_absence_followups(
    p_church_id,
    (now() at time zone 'Africa/Lagos')::date
  )
    into follow_up_count;

  return jsonb_build_object(
    'total',total_count,
    'present',present_count,
    'absent',absent_count,
    'follow_ups',follow_up_count
  );
end;
$$;

grant execute on function public.save_attendance_session(uuid,date,jsonb) to authenticated;
