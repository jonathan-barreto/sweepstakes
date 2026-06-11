-- Add unique constraint on user_id for leaderboard_snapshots
alter table leaderboard_snapshots add constraint leaderboard_snapshots_user_id_unique unique(user_id);
