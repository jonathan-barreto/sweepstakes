-- Create enum type for match status
create type match_status as enum ('scheduled', 'live', 'finished');

-- Create matches table
create table matches (
  id text primary key,
  stage text not null,
  group_name text,
  round_number int,
  match_date date not null,
  home_team text not null,
  away_team text not null,
  city text,
  status match_status not null default 'scheduled',
  home_score int,
  away_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for frequently queried columns
create index idx_matches_status on matches(status);
create index idx_matches_match_date on matches(match_date);
create index idx_matches_home_team on matches(home_team);
create index idx_matches_away_team on matches(away_team);
create index idx_matches_stage on matches(stage);
create index idx_matches_round on matches(round_number);

-- Enable Row Level Security
alter table matches enable row level security;

-- Create or replace updated_at trigger function (reusable for all tables)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at on any update
create trigger update_matches_updated_at
  before update on matches
  for each row
  execute function update_updated_at_column();
