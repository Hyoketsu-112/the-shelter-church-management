-- Comprehensive PRD/SDD completion migration.
-- Run after 001-004. Safe to apply once on a production project.

-- Multi-location assignments and workspace access.
create table if not exists public.user_church_access (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  church_id uuid not null references public.churches(id) on delete cascade,
  workspace text not null default 'junior' check (workspace in ('junior','main')),
  is_active boolean not null default true,
  primary key (profile_id, church_id, workspace)
);
alter table public.user_church_access enable row level security;

-- Complete child data required by the PRD.
alter table public.children add column if not exists allergies text;
alter table public.children add column if not exists emergency_contact_name text;
alter table public.children add column if not exists emergency_contact_phone text;

-- Attendance and follow-up.
create table if not exists public.attendance (
  id uuid primary key default uuid_generate_v4(),
  church_id uuid not null references public.churches(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  session_date date not null default current_date,
  present boolean not null default true,
  marked_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(child_id, session_date)
);
alter table public.attendance enable row level security;

-- Controlled public first-timer records. They are intentionally separate from children/members until staff review them.
create table if not exists public.visitor_submissions (
  id uuid primary key default uuid_generate_v4(),
  church_id uuid not null references public.churches(id) on delete cascade,
  workspace text not null check (workspace in ('junior','main')),
  full_name text not null,
  phone text,
  email text,
  child_name text,
  child_date_of_birth date,
  notes text,
  status text not null default 'new' check (status in ('new','contacted','converted','archived')),
  created_at timestamptz not null default now()
);
alter table public.visitor_submissions enable row level security;

create table if not exists public.import_log (
  id uuid primary key default uuid_generate_v4(),
  church_id uuid not null references public.churches(id),
  workspace text not null check (workspace in ('junior','main')),
  imported_by uuid references public.profiles(id),
  filename text not null,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  failed_rows integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.import_log enable row level security;

-- Private storage for optional child photos.
insert into storage.buckets(id,name,public) values ('child-photos','child-photos',false) on conflict (id) do nothing;

-- Profile helpers. Super admins remain global; everyone else must have an active assignment.
create or replace function public.has_church_access(target uuid, target_workspace text default 'junior')
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_super_admin() or exists (
    select 1 from public.user_church_access a
    where a.profile_id=auth.uid() and a.church_id=target and a.workspace=target_workspace and a.is_active
  ) or (target_workspace='junior' and target=public.get_my_church_id() and public.get_my_role() in ('dept_head','teacher','viewer'))
$$;

create or replace function public.teacher_can_access_child(target_child uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.children ch join public.class_teachers ct on ct.class_id=ch.class_id
    where ch.id=target_child and ct.profile_id=auth.uid()
  )
$$;

-- Replace broad teacher read access with class-level access.
drop policy if exists "users view permitted children" on public.children;
create policy "scoped users view children" on public.children for select to authenticated using (
  public.is_super_admin() or
  (public.get_my_role() in ('dept_head','viewer') and church_id=public.get_my_church_id()) or
  (public.get_my_role()='teacher' and public.teacher_can_access_child(id))
);

drop policy if exists "users view permitted classes" on public.classes;
create policy "scoped users view classes" on public.classes for select to authenticated using (
 public.is_super_admin() or church_id=public.get_my_church_id()
);

-- Attendance: teachers may mark only assigned children; admins have full church access.
create policy "staff view attendance" on public.attendance for select to authenticated using (
 public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id()) or public.teacher_can_access_child(child_id)
);
create policy "staff mark attendance" on public.attendance for insert to authenticated with check (
 (public.is_super_admin() or public.is_admin() or public.teacher_can_access_child(child_id)) and marked_by=auth.uid()
);
create policy "admins update attendance" on public.attendance for update to authenticated using (public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id()));

create policy "admins view visitors" on public.visitor_submissions for select to authenticated using (public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id()));
create policy "admins update visitors" on public.visitor_submissions for update to authenticated using (public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id()));
create policy "admins view import logs" on public.import_log for select to authenticated using (public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id()));
create policy "staff create import logs" on public.import_log for insert to authenticated with check (public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id()));

create policy "users view own assignments" on public.user_church_access for select to authenticated using (profile_id=auth.uid() or public.is_super_admin());
create policy "super admins manage assignments" on public.user_church_access for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- Safe public submission RPC: no direct public access to internal child/member tables.
create or replace function public.submit_first_timer(
  p_church_id uuid, p_workspace text, p_full_name text, p_phone text default null,
  p_email text default null, p_child_name text default null, p_child_date_of_birth date default null, p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
  if p_workspace not in ('junior','main') then raise exception 'Invalid workspace'; end if;
  if length(trim(coalesce(p_full_name,''))) < 2 then raise exception 'Name is required'; end if;
  if not exists(select 1 from public.churches where id=p_church_id and is_active=true) then raise exception 'Invalid church'; end if;
  insert into public.visitor_submissions(church_id,workspace,full_name,phone,email,child_name,child_date_of_birth,notes)
  values(p_church_id,p_workspace,trim(p_full_name),nullif(trim(coalesce(p_phone,'')),''),nullif(trim(coalesce(p_email,'')),''),nullif(trim(coalesce(p_child_name,'')),''),p_child_date_of_birth,nullif(trim(coalesce(p_notes,'')),'')) returning id into new_id;
  return new_id;
end $$;
grant execute on function public.submit_first_timer(uuid,text,text,text,text,text,date,text) to anon, authenticated;

-- Audit helper. UI calls this for views/exports; DB changes can also be logged from future triggers.
create or replace function public.log_audit(p_church_id uuid,p_action text,p_entity text,p_entity_id uuid default null,p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then return; end if;
 insert into public.audit_log(church_id,actor_id,action,entity,entity_id,metadata)
 values(p_church_id,auth.uid(),p_action,p_entity,p_entity_id,p_metadata);
end $$;
grant execute on function public.log_audit(uuid,text,text,uuid,jsonb) to authenticated;


-- Safe public list used only by the staff registration form.
create or replace view public.registration_churches as
  select id,name from public.churches where is_active=true;
grant select on public.registration_churches to anon, authenticated;

-- Registration trigger: public teacher sign-up is created inactive and requires admin approval.
create or replace function public.handle_new_staff_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare requested_church uuid;
begin
 requested_church := nullif(new.raw_user_meta_data->>'church_id','')::uuid;
 if requested_church is null or not exists(select 1 from public.churches where id=requested_church and is_active) then return new; end if;
 insert into public.profiles(id,church_id,full_name,phone,role,is_active)
 values(new.id,requested_church,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1)),new.raw_user_meta_data->>'phone','teacher',false)
 on conflict (id) do nothing;
 insert into public.user_church_access(profile_id,church_id,workspace,is_active)
 values(new.id,requested_church,'junior',false) on conflict do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created_staff on auth.users;
create trigger on_auth_user_created_staff after insert on auth.users for each row execute function public.handle_new_staff_user();

-- Storage policies: staff only; teachers may upload only through assigned workflows later.
create policy "admins manage child photos" on storage.objects for all to authenticated using (
 bucket_id='child-photos' and (public.is_super_admin() or public.is_admin())
) with check (bucket_id='child-photos' and (public.is_super_admin() or public.is_admin()));

create index if not exists attendance_church_date_idx on public.attendance(church_id,session_date);
create index if not exists visitors_church_workspace_idx on public.visitor_submissions(church_id,workspace,created_at desc);
