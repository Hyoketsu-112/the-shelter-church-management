-- Phase 1 security, helpers and production features.
-- Run this migration in the Supabase SQL Editor after 001 and 002.

create or replace function public.get_my_church_id()
returns uuid language sql stable security definer set search_path = public
as $$ select church_id from public.profiles where id = auth.uid() $$;

create or replace function public.get_my_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and is_active = true $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.get_my_role() in ('super_admin','dept_head'), false) $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists children_touch_updated_at on public.children;
create trigger children_touch_updated_at before update on public.children
for each row execute function public.touch_updated_at();

-- Remove old policies so this migration is safe to rerun.
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname='public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "church members view church" on public.churches for select to authenticated using (id = public.get_my_church_id());
create policy "users view profiles in church" on public.profiles for select to authenticated using (church_id = public.get_my_church_id());
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.is_admin() and church_id = public.get_my_church_id()) with check (public.is_admin() and church_id = public.get_my_church_id());

create policy "members view classes" on public.classes for select to authenticated using (church_id = public.get_my_church_id());
create policy "admins manage classes" on public.classes for all to authenticated using (public.is_admin() and church_id = public.get_my_church_id()) with check (public.is_admin() and church_id = public.get_my_church_id());

create policy "members view children" on public.children for select to authenticated using (church_id = public.get_my_church_id());
create policy "admins manage children" on public.children for all to authenticated using (public.is_admin() and church_id = public.get_my_church_id()) with check (public.is_admin() and church_id = public.get_my_church_id());

create policy "members view guardians" on public.guardians for select to authenticated using (church_id = public.get_my_church_id());
create policy "admins manage guardians" on public.guardians for all to authenticated using (public.is_admin() and church_id = public.get_my_church_id()) with check (public.is_admin() and church_id = public.get_my_church_id());

create policy "members view child guardians" on public.child_guardians for select to authenticated using (exists (select 1 from public.children c where c.id=child_id and c.church_id=public.get_my_church_id()));
create policy "admins manage child guardians" on public.child_guardians for all to authenticated using (public.is_admin() and exists (select 1 from public.children c where c.id=child_id and c.church_id=public.get_my_church_id())) with check (public.is_admin() and exists (select 1 from public.children c where c.id=child_id and c.church_id=public.get_my_church_id()));

create policy "members view class teachers" on public.class_teachers for select to authenticated using (exists (select 1 from public.classes c where c.id=class_id and c.church_id=public.get_my_church_id()));
create policy "admins manage class teachers" on public.class_teachers for all to authenticated using (public.is_admin() and exists (select 1 from public.classes c where c.id=class_id and c.church_id=public.get_my_church_id())) with check (public.is_admin() and exists (select 1 from public.classes c where c.id=class_id and c.church_id=public.get_my_church_id()));

create policy "admins manage notification settings" on public.notification_settings for all to authenticated using (public.is_admin() and church_id=public.get_my_church_id()) with check (public.is_admin() and church_id=public.get_my_church_id());
create policy "admins view notification logs" on public.notification_log for select to authenticated using (public.is_admin() and church_id=public.get_my_church_id());
create policy "admins view audit logs" on public.audit_log for select to authenticated using (public.is_admin() and church_id=public.get_my_church_id());

create index if not exists children_church_name_idx on public.children(church_id, last_name, first_name);
create index if not exists children_church_dob_idx on public.children(church_id, date_of_birth);
create index if not exists guardians_church_idx on public.guardians(church_id);

-- Deleting a class should not delete children; unassign them instead.
alter table public.children drop constraint if exists children_class_id_fkey;
alter table public.children add constraint children_class_id_fkey foreign key (class_id) references public.classes(id) on delete set null;
create unique index if not exists classes_unique_name_per_church on public.classes(church_id, lower(name));
