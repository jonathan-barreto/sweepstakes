-- Update the trigger function with hardcoded URL
create or replace function trigger_leaderboard_update()
returns void as $$
declare
  request_id bigint;
begin
  select net.http_post(
    url := 'https://smeacdkzzmxpayycqiuo.supabase.co/functions/v1/update-leaderboard',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  ) into request_id;
exception when others then
  raise warning 'Error calling update-leaderboard function: %', sqlerrm;
end;
$$ language plpgsql;
