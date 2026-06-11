-- Update the trigger function with anon key from secrets
create or replace function trigger_leaderboard_update()
returns void as $$
declare
  request_id bigint;
  anon_key text;
begin
  anon_key := current_setting('app.settings.jwt_secret', true);
  
  if anon_key is null then
    raise warning 'SUPABASE_ANON_KEY not configured in secrets';
    return;
  end if;

  select net.http_post(
    url := 'https://smeacdkzzmxpayycqiuo.supabase.co/functions/v1/update-leaderboard',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := '{}'::jsonb
  ) into request_id;
exception when others then
  raise warning 'Error calling update-leaderboard function: %', sqlerrm;
end;
$$ language plpgsql;
