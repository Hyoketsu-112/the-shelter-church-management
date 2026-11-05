-- Multi-location and dual-workspace upgrade for The Shelter Church Management System.
-- Run after migrations 001, 002 and 003.

alter table public.churches add column if not exists location_key text;
alter table public.churches add column if not exists is_active boolean not null default true;
create unique index if not exists churches_location_key_unique on public.churches(location_key) where location_key is not null;

-- Main Church data is deliberately separate from Junior Church children records.
create table if not exists public.members (
 id uuid primary key default uuid_generate_v4(),
 church_id uuid not null references public.churches(id) on delete cascade,
 first_name text not null,
 last_name text not null,
 phone text,
 email text,
 date_of_birth date,
 gender text,
 address text,
 status text not null default 'active' check (status in ('active','inactive')),
 joined_on date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists members_church_name_idx on public.members(church_id,last_name,first_name);
alter table public.members enable row level security;
drop trigger if exists members_touch_updated_at on public.members;
create trigger members_touch_updated_at before update on public.members for each row execute function public.touch_updated_at();

-- Seed the four Shelter locations without duplicating existing rows.
insert into public.churches(name, location_key) values
 ('The Shelter Anthony','anthony'),
 ('The Shelter Okota','okota'),
 ('The Shelter Community','community'),
 ('Excellent Church','excellent')
on conflict (location_key) where location_key is not null
do update set name=excluded.name;

-- Super Admins can access every location. Other users remain restricted to their assigned church.
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select role='super_admin' and is_active from public.profiles where id=auth.uid()),false) $$;

-- Replace old single-location policies.
drop policy if exists "church members view church" on public.churches;
drop policy if exists "users view profiles in church" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "members view classes" on public.classes;
drop policy if exists "admins manage classes" on public.classes;
drop policy if exists "members view children" on public.children;
drop policy if exists "admins manage children" on public.children;
drop policy if exists "members view guardians" on public.guardians;
drop policy if exists "admins manage guardians" on public.guardians;
drop policy if exists "members view child guardians" on public.child_guardians;
drop policy if exists "admins manage child guardians" on public.child_guardians;
drop policy if exists "members view class teachers" on public.class_teachers;
drop policy if exists "admins manage class teachers" on public.class_teachers;


create policy "users view permitted churches" on public.churches for select to authenticated using (public.is_super_admin() or id=public.get_my_church_id());
create policy "super admins manage churches" on public.churches for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy "users view permitted profiles" on public.profiles for select to authenticated using (public.is_super_admin() or church_id=public.get_my_church_id());
create policy "super admins manage profiles" on public.profiles for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy "users view permitted classes" on public.classes for select to authenticated using (public.is_super_admin() or church_id=public.get_my_church_id());
create policy "admins manage permitted classes" on public.classes for all to authenticated using (public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id())) with check (public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id()));

create policy "users view permitted children" on public.children for select to authenticated using (public.is_super_admin() or church_id=public.get_my_church_id());
create policy "admins manage permitted children" on public.children for all to authenticated using (public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id())) with check (public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id()));

create policy "users view permitted guardians" on public.guardians for select to authenticated using (public.is_super_admin() or church_id=public.get_my_church_id());
create policy "admins manage permitted guardians" on public.guardians for all to authenticated using (public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id())) with check (public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id()));

create policy "users view permitted child guardians" on public.child_guardians for select to authenticated using (public.is_super_admin() or exists(select 1 from public.children c where c.id=child_id and c.church_id=public.get_my_church_id()));
create policy "admins manage permitted child guardians" on public.child_guardians for all to authenticated using (public.is_super_admin() or (public.is_admin() and exists(select 1 from public.children c where c.id=child_id and c.church_id=public.get_my_church_id()))) with check (public.is_super_admin() or (public.is_admin() and exists(select 1 from public.children c where c.id=child_id and c.church_id=public.get_my_church_id())));

create policy "users view permitted class teachers" on public.class_teachers for select to authenticated using (public.is_super_admin() or exists(select 1 from public.classes c where c.id=class_id and c.church_id=public.get_my_church_id()));
create policy "admins manage permitted class teachers" on public.class_teachers for all to authenticated using (public.is_super_admin() or (public.is_admin() and exists(select 1 from public.classes c where c.id=class_id and c.church_id=public.get_my_church_id()))) with check (public.is_super_admin() or (public.is_admin() and exists(select 1 from public.classes c where c.id=class_id and c.church_id=public.get_my_church_id())));

create policy "users view permitted members" on public.members for select to authenticated using (public.is_super_admin() or church_id=public.get_my_church_id());
create policy "admins manage permitted members" on public.members for all to authenticated using (public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id())) with check (public.is_super_admin() or (public.is_admin() and church_id=public.get_my_church_id()));
