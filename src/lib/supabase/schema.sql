create table if not exists profiles (
  id uuid primary key,
  email text not null unique,
  display_name text not null,
  home_city text,
  passport text,
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
  type text not null check (type in ('email', 'link')),
  token text not null unique,
  email text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
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

create table if not exists votes (
  id uuid primary key,
  trip_id uuid not null references trips(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('destination', 'date_window')),
  option_id text not null,
  created_at timestamptz not null default now(),
  unique (trip_id, profile_id, type)
);
