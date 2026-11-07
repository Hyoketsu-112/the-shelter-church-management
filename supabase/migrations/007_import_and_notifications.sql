-- Import engine and in-app notification centre.
-- Apply after the existing Junior Church migrations.

create table if not exists public.user_notifications (
  id uuid primary key default uuid_generate_v4(),
  church_id uuid not null references public.churches(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  href text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.user_notifications enable row level security;
create index if not exists user_notifications_recipient_idx
  on public.user_notifications(recipient_id, is_read, created_at desc);

create policy "users manage own notifications" on public.user_notifications
for select to authenticated using (recipient_id = auth.uid());

create policy "users update own notifications" on public.user_notifications
for update to authenticated using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

create or replace function public.create_staff_notification(
  p_church_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_href text default null,
  p_entity_type text default null,
  p_entity_id uuid default null
) returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into public.user_notifications
    (church_id, recipient_id, type, title, message, href, entity_type, entity_id)
  select p_church_id, id, p_type, p_title, p_message, p_href, p_entity_type, p_entity_id
  from public.profiles
  where church_id = p_church_id
    and is_active = true
    and role in ('super_admin','dept_head');
end;
$$;
grant execute on function public.create_staff_notification(uuid,text,text,text,text,text,uuid) to authenticated;

create or replace function public.import_children_with_guardians(
  p_church_id uuid,
  p_filename text,
  p_rows jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  r jsonb;
  child_id uuid;
  primary_guardian_id uuid;
  secondary_guardian_id uuid;
  class_value uuid;
  imported integer := 0;
  skipped integer := 0;
  errors jsonb := '[]'::jsonb;
begin
  if not (public.is_super_admin() or (public.is_admin() and p_church_id=public.get_my_church_id())) then
    raise exception 'You do not have permission to import records for this location';
  end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    begin
      if coalesce(trim(r->>'first_name'),'')='' or coalesce(trim(r->>'last_name'),'')='' or coalesce(trim(r->>'date_of_birth'),'')='' then
        raise exception 'First name, last name and date of birth are required';
      end if;

      class_value := null;
      if nullif(trim(coalesce(r->>'class_name','')),'') is not null then
        select id into class_value from public.classes
        where church_id=p_church_id and lower(name)=lower(trim(r->>'class_name')) limit 1;
      end if;

      select id into child_id from public.children
      where church_id=p_church_id
        and lower(first_name)=lower(trim(r->>'first_name'))
        and lower(last_name)=lower(trim(r->>'last_name'))
        and date_of_birth=(r->>'date_of_birth')::date
      limit 1;

      if child_id is not null then
        skipped := skipped + 1;
        continue;
      end if;

      insert into public.children(
        church_id,first_name,last_name,date_of_birth,gender,class_id,status,joined_on,
        allergies,medical_notes,special_needs_notes,emergency_contact_name,emergency_contact_phone
      ) values (
        p_church_id,trim(r->>'first_name'),trim(r->>'last_name'),(r->>'date_of_birth')::date,
        nullif(trim(coalesce(r->>'gender','')),''),class_value,
        coalesce(nullif(trim(coalesce(r->>'status','')),''),'active'),
        nullif(trim(coalesce(r->>'joined_on','')),'')::date,
        nullif(trim(coalesce(r->>'allergies','')),''),
        nullif(trim(coalesce(r->>'medical_notes','')),''),
        nullif(trim(coalesce(r->>'special_needs_notes','')),''),
        nullif(trim(coalesce(r->>'emergency_contact_name','')),''),
        nullif(trim(coalesce(r->>'emergency_contact_phone','')),'')
      ) returning id into child_id;

      if nullif(trim(coalesce(r->>'primary_guardian_full_name','')),'') is not null then
        insert into public.guardians(church_id,full_name,relationship,phone,whatsapp,email,is_authorised_pickup)
        values (
          p_church_id,trim(r->>'primary_guardian_full_name'),
          nullif(trim(coalesce(r->>'primary_guardian_relationship','')),''),
          nullif(trim(coalesce(r->>'primary_guardian_phone','')),''),
          nullif(trim(coalesce(r->>'primary_guardian_whatsapp','')),''),
          nullif(trim(coalesce(r->>'primary_guardian_email','')),''),
          lower(coalesce(r->>'primary_guardian_authorised_pickup',''))='yes'
        ) returning id into primary_guardian_id;
        insert into public.child_guardians(child_id,guardian_id,is_primary) values(child_id,primary_guardian_id,true);
      end if;

      if nullif(trim(coalesce(r->>'secondary_guardian_full_name','')),'') is not null then
        insert into public.guardians(church_id,full_name,relationship,phone,whatsapp,email,is_authorised_pickup)
        values (
          p_church_id,trim(r->>'secondary_guardian_full_name'),
          nullif(trim(coalesce(r->>'secondary_guardian_relationship','')),''),
          nullif(trim(coalesce(r->>'secondary_guardian_phone','')),''),
          nullif(trim(coalesce(r->>'secondary_guardian_whatsapp','')),''),
          nullif(trim(coalesce(r->>'secondary_guardian_email','')),''),
          lower(coalesce(r->>'secondary_guardian_authorised_pickup',''))='yes'
        ) returning id into secondary_guardian_id;
        insert into public.child_guardians(child_id,guardian_id,is_primary) values(child_id,secondary_guardian_id,false);
      end if;

      imported := imported + 1;
    exception when others then
      errors := errors || jsonb_build_array(jsonb_build_object('row', r, 'error', sqlerrm));
    end;
  end loop;

  insert into public.import_log(church_id,workspace,imported_by,filename,total_rows,imported_rows,failed_rows)
  values(p_church_id,'junior',auth.uid(),p_filename,jsonb_array_length(p_rows),imported,jsonb_array_length(errors));

  perform public.create_staff_notification(
    p_church_id,'import','Child import completed',
    imported::text || ' child record(s) imported. ' || skipped::text || ' duplicate record(s) skipped.',
    '/import'
  );

  return jsonb_build_object('imported',imported,'skipped',skipped,'failed',jsonb_array_length(errors),'errors',errors);
end;
$$;
grant execute on function public.import_children_with_guardians(uuid,text,jsonb) to authenticated;

-- Birthday reminders are generated on demand by an external scheduler/Edge Function.
create or replace function public.generate_birthday_notifications()
returns integer
language plpgsql security definer set search_path=public as $$
declare
  c record;
  count_created integer := 0;
begin
  for c in
    select ch.id, ch.church_id, ch.first_name, ch.last_name
    from public.children ch
    join public.notification_settings ns on ns.church_id=ch.church_id
    where ch.archived_at is null
      and extract(month from ch.date_of_birth)=extract(month from current_date)
      and extract(day from ch.date_of_birth)=extract(day from current_date)
  loop
    perform public.create_staff_notification(
      c.church_id,'birthday','Birthday today',
      c.first_name || ' ' || c.last_name || ' has a birthday today.',
      '/birthdays','child',c.id
    );
    count_created := count_created + 1;
  end loop;
  return count_created;
end;
$$;
