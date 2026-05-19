create extension if not exists pgcrypto;

create or replace function public.is_trip_creator(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from trips
    where trips.id = target_trip_id
      and trips.creator_profile_id = auth.uid()
  );
$$;

create or replace function public.is_trip_member(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.is_trip_creator(target_trip_id)
    or exists (
      select 1
      from trip_members
      where trip_members.trip_id = target_trip_id
        and trip_members.profile_id = auth.uid()
    );
$$;

create or replace function public.is_trip_planner(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.is_trip_creator(target_trip_id)
    or exists (
      select 1
      from trip_members
      where trip_members.trip_id = target_trip_id
        and trip_members.profile_id = auth.uid()
        and trip_members.role = 'planner'
    );
$$;

create or replace function public.is_trip_joinable(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from trip_invites
    where trip_invites.trip_id = target_trip_id
      and trip_invites.revoked_at is null
      and (trip_invites.expires_at is null or trip_invites.expires_at > now())
  );
$$;

create or replace function public.can_view_profile(target_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() = target_profile_id
    or exists (
      select 1
      from trips
      where trips.creator_profile_id = target_profile_id
        and (
          public.is_trip_member(trips.id)
          or public.is_trip_joinable(trips.id)
        )
    )
    or exists (
      select 1
      from trip_members
      where trip_members.profile_id = target_profile_id
        and public.is_trip_member(trip_members.trip_id)
    );
$$;

create table if not exists profiles (
  id uuid primary key,
  email text not null unique,
  display_name text not null,
  home_city text,
  passport text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists trips (
  id uuid primary key,
  creator_profile_id uuid not null references profiles(id),
  title text not null,
  group_name text not null,
  summary text not null default '',
  tentative_start date not null,
  tentative_end date not null,
  status text not null check (status in ('draft', 'collecting_members', 'planning', 'voting', 'decided')),
  decided_at timestamptz,
  final_destination_id text,
  final_destination_snapshot jsonb,
  final_date_start date,
  final_date_end date,
  final_locked_by_profile_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists trip_members (
  id uuid primary key,
  trip_id uuid not null references trips(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('planner', 'member')),
  joined_at timestamptz not null default now(),
  unique (trip_id, profile_id)
);

create table if not exists trip_invites (
  id uuid primary key,
  trip_id uuid not null references trips(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

create table if not exists availability_ranges (
  id uuid primary key,
  trip_id uuid not null references trips(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null
);

create table if not exists destinations (
  id text primary key,
  city text not null,
  country text not null,
  country_code text not null,
  lat numeric not null,
  lon numeric not null,
  image text not null,
  tags text[] not null default '{}',
  best_for text[] not null default '{}',
  summary text not null
);

create table if not exists trip_destinations (
  id uuid primary key,
  trip_id uuid not null references trips(id) on delete cascade,
  destination_id text not null references destinations(id),
  added_by_profile_id uuid not null references profiles(id),
  note text not null default '',
  shortlist boolean not null default false,
  created_at timestamptz not null default now(),
  unique (trip_id, destination_id)
);

create table if not exists destination_enrichments (
  destination_id text primary key references destinations(id) on delete cascade,
  short_summary text not null,
  long_summary text not null,
  vibe_tags text[] not null default '{}',
  top_activities jsonb not null default '[]'::jsonb,
  budget_tier text not null check (budget_tier in ('value', 'balanced', 'premium')),
  local_costs jsonb not null default '{}'::jsonb,
  source text not null default 'heuristic',
  coverage text not null default 'partial' check (coverage in ('partial', 'complete')),
  fetched_at timestamptz not null default now(),
  stale_at timestamptz not null default (now() + interval '30 days'),
  updated_at timestamptz not null default now()
);

create table if not exists votes (
  id uuid primary key,
  trip_id uuid not null references trips(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('destination', 'date_window')),
  option_id text not null,
  created_at timestamptz not null default now(),
  unique (trip_id, profile_id, type)
);

create table if not exists profile_availability_windows (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  label text not null,
  start_month_day text not null,
  end_month_day text not null,
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists photo_url text;
alter table trips add column if not exists decided_at timestamptz;
alter table trips add column if not exists final_date_option_ids text[] not null default '{}';
alter table trips add column if not exists trip_duration integer not null default 7;
alter table trips add column if not exists final_destination_id text;
alter table trips add column if not exists final_destination_snapshot jsonb;
alter table trips add column if not exists final_date_start date;
alter table trips add column if not exists final_date_end date;
alter table trips add column if not exists final_locked_by_profile_id uuid references profiles(id);
alter table trip_invites add column if not exists expires_at timestamptz;
alter table trip_invites add column if not exists revoked_at timestamptz;
alter table trip_invites drop column if exists type;
alter table trip_invites drop column if exists email;
alter table trip_invites drop column if exists accepted_at;

alter table profiles enable row level security;
alter table trips enable row level security;
alter table trip_members enable row level security;
alter table trip_invites enable row level security;

drop policy if exists "profiles_select_self" on profiles;
create policy "profiles_select_self" on profiles
for select using (public.can_view_profile(id));

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles
for update using (auth.uid() = id);

drop policy if exists "profiles_insert_self" on profiles;
create policy "profiles_insert_self" on profiles
for insert with check (auth.uid() = id);

drop policy if exists "trips_select_visible" on trips;
create policy "trips_select_visible" on trips
for select using (public.is_trip_member(id) or public.is_trip_joinable(id));

drop policy if exists "trips_insert_creator" on trips;
create policy "trips_insert_creator" on trips
for insert with check (creator_profile_id = auth.uid());

drop policy if exists "trips_update_planner" on trips;
create policy "trips_update_planner" on trips
for update using (public.is_trip_planner(id));

drop policy if exists "trips_delete_creator" on trips;
create policy "trips_delete_creator" on trips
for delete using (creator_profile_id = auth.uid());

drop policy if exists "trip_members_select_visible" on trip_members;
create policy "trip_members_select_visible" on trip_members
for select using (profile_id = auth.uid() or public.is_trip_member(trip_id));

drop policy if exists "trip_members_insert_self_or_planner" on trip_members;
create policy "trip_members_insert_self_or_planner" on trip_members
for insert with check (
  public.is_trip_creator(trip_id)
  or (profile_id = auth.uid() and public.is_trip_joinable(trip_id))
);

drop policy if exists "trip_members_delete_planner" on trip_members;
create policy "trip_members_delete_planner" on trip_members
for delete using (public.is_trip_planner(trip_id) and profile_id != auth.uid());

drop policy if exists "trip_members_delete_self" on trip_members;
create policy "trip_members_delete_self" on trip_members
for delete using (auth.uid() = profile_id);

-- Only trip members can browse invites. Non-members use the
-- lookup_invite_by_token() security-definer function for the join/preview flow.
drop policy if exists "trip_invites_select_visible" on trip_invites;
create policy "trip_invites_select_visible" on trip_invites
for select using (public.is_trip_member(trip_id));

-- Security-definer function: look up a single invite by its token.
-- Bypasses RLS so the invite preview and join flows work for non-members
-- who possess the token (the token IS the authorization).
create or replace function public.lookup_invite_by_token(invite_token text)
returns table (
  id uuid, trip_id uuid, token text,
  created_at timestamptz, expires_at timestamptz, revoked_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select i.id, i.trip_id, i.token, i.created_at, i.expires_at, i.revoked_at
  from trip_invites i
  where i.token = invite_token
  limit 1;
$$;

drop policy if exists "trip_invites_insert_planner" on trip_invites;
create policy "trip_invites_insert_planner" on trip_invites
for insert with check (public.is_trip_planner(trip_id));

drop policy if exists "trip_invites_update_planner" on trip_invites;
drop policy if exists "trip_invites_update_planner_or_recipient" on trip_invites;
create policy "trip_invites_update_planner" on trip_invites
for update using (public.is_trip_planner(trip_id));

-- Planning tables RLS

alter table availability_ranges enable row level security;
alter table destinations enable row level security;
alter table trip_destinations enable row level security;
alter table destination_enrichments enable row level security;
alter table votes enable row level security;
alter table profile_availability_windows enable row level security;

-- profile_availability_windows: users manage their own rows

drop policy if exists "paw_select_own" on profile_availability_windows;
create policy "paw_select_own" on profile_availability_windows
for select using (auth.uid() = profile_id);

drop policy if exists "paw_insert_own" on profile_availability_windows;
create policy "paw_insert_own" on profile_availability_windows
for insert with check (auth.uid() = profile_id);

drop policy if exists "paw_delete_own" on profile_availability_windows;
create policy "paw_delete_own" on profile_availability_windows
for delete using (auth.uid() = profile_id);

-- availability_ranges: trip members see all; insert/delete own

drop policy if exists "ar_select_trip_member" on availability_ranges;
create policy "ar_select_trip_member" on availability_ranges
for select using (public.is_trip_member(trip_id));

drop policy if exists "ar_insert_own" on availability_ranges;
create policy "ar_insert_own" on availability_ranges
for insert with check (auth.uid() = profile_id and public.is_trip_member(trip_id));

drop policy if exists "ar_delete_own" on availability_ranges;
create policy "ar_delete_own" on availability_ranges
for delete using (auth.uid() = profile_id and public.is_trip_member(trip_id));

-- destinations: any authenticated user can read/insert

drop policy if exists "dest_select_authenticated" on destinations;
create policy "dest_select_authenticated" on destinations
for select using (auth.uid() is not null);

drop policy if exists "dest_insert_authenticated" on destinations;
create policy "dest_insert_authenticated" on destinations
for insert with check (auth.uid() is not null);

-- No UPDATE policy on destinations — catalog data is insert-only reference data.
drop policy if exists "dest_update_authenticated" on destinations;

-- trip_destinations: trip members can read/insert; planner can update shortlist

drop policy if exists "td_select_trip_member" on trip_destinations;
create policy "td_select_trip_member" on trip_destinations
for select using (public.is_trip_member(trip_id));

drop policy if exists "td_insert_trip_member" on trip_destinations;
create policy "td_insert_trip_member" on trip_destinations
for insert with check (public.is_trip_member(trip_id));

drop policy if exists "td_update_planner" on trip_destinations;
create policy "td_update_planner" on trip_destinations
for update using (public.is_trip_planner(trip_id));

drop policy if exists "td_delete_planner" on trip_destinations;
create policy "td_delete_planner" on trip_destinations
for delete using (public.is_trip_planner(trip_id));

-- destination_enrichments: authenticated users can read and refresh cached shared data

drop policy if exists "de_select_authenticated" on destination_enrichments;
create policy "de_select_authenticated" on destination_enrichments
for select using (auth.uid() is not null);

drop policy if exists "de_insert_authenticated" on destination_enrichments;
create policy "de_insert_authenticated" on destination_enrichments
for insert with check (auth.uid() is not null);

-- Only allow updating enrichments that are stale (due for refresh).
-- Fresh enrichments cannot be tampered with by arbitrary users.
drop policy if exists "de_update_authenticated" on destination_enrichments;
drop policy if exists "de_update_stale_only" on destination_enrichments;
create policy "de_update_stale_only" on destination_enrichments
for update using (auth.uid() is not null and stale_at <= now());

-- votes: trip members can read; members insert/update their own

drop policy if exists "votes_select_trip_member" on votes;
create policy "votes_select_trip_member" on votes
for select using (public.is_trip_member(trip_id));

drop policy if exists "votes_insert_own" on votes;
create policy "votes_insert_own" on votes
for insert with check (auth.uid() = profile_id and public.is_trip_member(trip_id));

drop policy if exists "votes_update_own" on votes;
create policy "votes_update_own" on votes
for update using (auth.uid() = profile_id and public.is_trip_member(trip_id));

drop policy if exists "votes_delete_own" on votes;
create policy "votes_delete_own" on votes
for delete using (auth.uid() = profile_id and public.is_trip_member(trip_id));
