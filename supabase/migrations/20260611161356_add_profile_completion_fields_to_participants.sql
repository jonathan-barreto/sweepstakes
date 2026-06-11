alter table participants add column if not exists nickname text;
alter table participants add column if not exists favorite_team text;
alter table participants add column if not exists profile_completed boolean not null default false;
alter table participants add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_participants_nickname on participants(nickname);
create index if not exists idx_participants_favorite_team on participants(favorite_team);
create index if not exists idx_participants_profile_completed on participants(profile_completed);

drop trigger if exists update_participants_updated_at on participants;
create trigger update_participants_updated_at
	before update on participants
	for each row
	execute function update_updated_at_column();
