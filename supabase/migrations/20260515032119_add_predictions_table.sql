-- Create predictions table
create table predictions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  match_id text not null references matches(id) on delete cascade,
  predicted_home_score int not null,
  predicted_away_score int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for frequently queried columns
create index idx_predictions_participant_id on predictions(participant_id);
create index idx_predictions_match_id on predictions(match_id);
create index idx_predictions_participant_match on predictions(participant_id, match_id);

-- Enable Row Level Security
alter table predictions enable row level security;

-- Trigger to automatically update updated_at on any update
create trigger update_predictions_updated_at
  before update on predictions
  for each row
  execute function update_updated_at_column();
