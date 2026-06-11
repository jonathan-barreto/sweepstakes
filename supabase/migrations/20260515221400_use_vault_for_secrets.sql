-- Update the trigger function to use environment variables
create or replace function trigger_leaderboard_update()
returns void as $$
declare
  request_id bigint;
  anon_key text;
  base_url text;
begin
  base_url := 'https://smeacdkzzmxpayycqiuo.supabase.co/functions/v1';
  anon_key := current_setting('app.settings.anon_key', true);
  
  if anon_key is null then
    raise warning 'SUPABASE_ANON_KEY not configured';
    return;
  end if;

  select net.http_post(
    url := base_url || '/update-leaderboard',
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
