-- ProductJarvis production: users table aligned with Supabase Auth.
-- Runs after auth_onboarding_ux and before backend_hardening so analytics_events.user_id FK resolves.
-- Requires Supabase (auth schema). For existing DBs with data, backfill public.users from auth.users before adding FKs.

-- Mirror auth.users in public for FKs from workspace_members, user_profiles, analytics_events.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep public.users in sync with auth.users (sign-up).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, raw_user_meta_data, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data, '{}'::jsonb),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_auth_user();

-- Backfill existing auth.users into public.users (idempotent).
insert into public.users (id, email, raw_user_meta_data, updated_at)
select id, email, coalesce(raw_user_meta_data, '{}'::jsonb), now()
from auth.users
on conflict (id) do update set
  email = excluded.email,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

-- Point workspace_members and user_profiles to public.users.
-- Skip if rows exist with user_ids not in public.users (run backfill first).
alter table workspace_members
  drop constraint if exists workspace_members_user_id_fkey,
  add constraint workspace_members_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

alter table user_profiles
  drop constraint if exists user_profiles_user_id_fkey,
  add constraint user_profiles_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;

-- analytics_events is created in 202603031000_backend_hardening with user_id references users(id);
-- that FK will now resolve. If phase3_cutover dropped it, re-add in a later migration.

comment on table public.users is 'Mirror of auth.users for FKs; synced via trigger and backfill.';
