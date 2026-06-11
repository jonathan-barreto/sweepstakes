-- Update the trigger function with hardcoded anon key
create or replace function trigger_leaderboard_update()
returns void as $$
declare
  request_id bigint;
begin
  select net.http_post(
    url := 'https://smeacdkzzmxpayycqiuo.supabase.co/functions/v1/update-leaderboard',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtZWFjZGt6em14cGF5eWNxaXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTgyMDcsImV4cCI6MjA5NDM3NDIwN30.Udfp84rVB87qlgSCbMrYeZFK7NOKrzn-QO6Dx-CblEs'
    ),
    body := '{}'::jsonb
  ) into request_id;
exception when others then
  raise warning 'Error calling update-leaderboard function: %', sqlerrm;
end;
$$ language plpgsql;
