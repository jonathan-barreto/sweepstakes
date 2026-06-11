-- Enable pg_cron extension
create extension if not exists pg_cron;

-- Create a function to call the Edge Function via HTTP
create or replace function trigger_leaderboard_update()
returns void as $$
declare
  response record;
begin
  perform
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/update-leaderboard',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
exception when others then
  raise warning 'Error calling update-leaderboard function: %', sqlerrm;
end;
$$ language plpgsql;

-- Schedule the cron job to run every minute
select cron.schedule('update-leaderboard-every-minute', '* * * * *', 'select trigger_leaderboard_update()');
