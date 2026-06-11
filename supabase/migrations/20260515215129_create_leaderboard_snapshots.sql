-- Create leaderboard_snapshots table
create table leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references participants(id) on delete cascade,
  username text not null,
  score integer not null default 0,
  correct_count integer not null default 0,
  correct_results integer not null default 0,
  current_rank integer not null,
  previous_rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for performance
create index idx_leaderboard_snapshots_user_id on leaderboard_snapshots(user_id);
create index idx_leaderboard_snapshots_current_rank on leaderboard_snapshots(current_rank);
create index idx_leaderboard_snapshots_created_at on leaderboard_snapshots(created_at);

-- Enable RLS
alter table leaderboard_snapshots enable row level security;
