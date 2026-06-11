-- Add points column to predictions table
alter table predictions add column points integer not null default 0;

-- Create index for points
create index idx_predictions_points on predictions(points);
