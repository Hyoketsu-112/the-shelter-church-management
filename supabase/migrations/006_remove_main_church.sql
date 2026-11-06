-- Remove the discontinued Main Church/adult database and keep this system Junior Church only.
-- Apply after migrations 001-005.

drop table if exists public.members cascade;

delete from public.user_church_access where workspace <> 'junior';
alter table public.user_church_access drop constraint if exists user_church_access_workspace_check;
alter table public.user_church_access
  add constraint user_church_access_workspace_check check (workspace = 'junior');

delete from public.visitor_submissions where workspace <> 'junior';
alter table public.visitor_submissions drop constraint if exists visitor_submissions_workspace_check;
alter table public.visitor_submissions
  add constraint visitor_submissions_workspace_check check (workspace = 'junior');

delete from public.import_log where workspace <> 'junior';
alter table public.import_log drop constraint if exists import_log_workspace_check;
alter table public.import_log
  add constraint import_log_workspace_check check (workspace = 'junior');

create or replace function public.has_church_access(target uuid, target_workspace text default 'junior')
returns boolean language sql stable security definer set search_path=public as $$
  select target_workspace = 'junior' and (
    public.is_super_admin() or exists (
      select 1 from public.user_church_access a
      where a.profile_id=auth.uid() and a.church_id=target
        and a.workspace='junior' and a.is_active
    ) or (target=public.get_my_church_id()
      and public.get_my_role() in ('dept_head','teacher','viewer'))
  )
$$;

create or replace function public.submit_first_timer(
  p_church_id uuid, p_workspace text, p_full_name text, p_phone text default null,
  p_email text default null, p_child_name text default null,
  p_child_date_of_birth date default null, p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
  if p_workspace <> 'junior' then raise exception 'Only Junior Church registration is available'; end if;
  if length(trim(coalesce(p_full_name,''))) < 2 then raise exception 'Name is required'; end if;
  if not exists(select 1 from public.churches where id=p_church_id and is_active=true) then raise exception 'Invalid church'; end if;
  insert into public.visitor_submissions(church_id,workspace,full_name,phone,email,child_name,child_date_of_birth,notes)
  values(p_church_id,'junior',trim(p_full_name),nullif(trim(coalesce(p_phone,'')),''),nullif(trim(coalesce(p_email,'')),''),nullif(trim(coalesce(p_child_name,'')),''),p_child_date_of_birth,nullif(trim(coalesce(p_notes,'')),'')) returning id into new_id;
  return new_id;
end $$;
