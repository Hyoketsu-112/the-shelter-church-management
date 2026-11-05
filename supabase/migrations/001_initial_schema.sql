-- Children's Department Database: Phase 1 production schema
create extension if not exists "uuid-ossp";

create table public.churches (
 id uuid primary key default uuid_generate_v4(), name text not null, logo_url text,
 timezone text not null default 'Africa/Lagos', access_mode text not null default 'standard', created_at timestamptz not null default now(),
 constraint access_mode_check check (access_mode in ('standard','pin','magic_link'))
);

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, church_id uuid not null references public.churches(id),
 full_name text not null, phone text, role text not null default 'teacher', is_active boolean not null default true,
 constraint role_check check (role in ('super_admin','dept_head','teacher','viewer'))
);

create table public.classes (
 id uuid primary key default uuid_generate_v4(), church_id uuid not null references public.churches(id) on delete cascade,
 name text not null, min_age int, max_age int, created_at timestamptz not null default now()
);

create table public.class_teachers (
 class_id uuid references public.classes(id) on delete cascade, profile_id uuid references public.profiles(id) on delete cascade,
 primary key(class_id, profile_id)
);

create table public.children (
 id uuid primary key default uuid_generate_v4(), church_id uuid not null references public.churches(id) on delete cascade,
 first_name text not null, last_name text not null, date_of_birth date not null, gender text, class_id uuid references public.classes(id),
 photo_path text, medical_notes text, special_needs_notes text, status text not null default 'active', joined_on date,
 archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint child_status_check check (status in ('active','inactive','graduated'))
);

create table public.guardians (
 id uuid primary key default uuid_generate_v4(), church_id uuid not null references public.churches(id) on delete cascade,
 full_name text not null, relationship text, phone text, whatsapp text, email text, is_authorised_pickup boolean not null default false
);

create table public.child_guardians (
 child_id uuid references public.children(id) on delete cascade, guardian_id uuid references public.guardians(id) on delete cascade,
 is_primary boolean not null default false, primary key(child_id,guardian_id)
);

create table public.notification_settings (
 church_id uuid primary key references public.churches(id) on delete cascade, lead_days int[] not null default '{7,1,0}',
 channels text[] not null default '{in_app,email}', birthday_message_template text, send_to_guardians boolean not null default false
);

create table public.notification_log (
 id uuid primary key default uuid_generate_v4(), church_id uuid not null references public.churches(id), child_id uuid references public.children(id),
 channel text not null, recipient text, status text not null default 'pending', error text, sent_at timestamptz
);

create table public.audit_log (
 id uuid primary key default uuid_generate_v4(), church_id uuid not null references public.churches(id), actor_id uuid references auth.users(id),
 action text not null, entity text not null, entity_id uuid, metadata jsonb default '{}'::jsonb, created_at timestamptz not null default now()
);

-- Every production table is locked down by default.
alter table public.churches enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_teachers enable row level security;
alter table public.children enable row level security;
alter table public.guardians enable row level security;
alter table public.child_guardians enable row level security;
alter table public.notification_settings enable row level security;
alter table public.notification_log enable row level security;
alter table public.audit_log enable row level security;
