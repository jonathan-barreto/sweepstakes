-- Create participants table
create table participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Create indexes for frequently queried columns
create index idx_participants_email on participants(email);

-- Enable Row Level Security
alter table participants enable row level security;
