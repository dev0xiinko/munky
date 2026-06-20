-- Daily Cron that invokes the send-bill-reminders Edge Function (§8).
-- Requires the pg_cron and pg_net extensions (available on Supabase).
--
-- Before running, store your project URL + service-role key in Vault so they
-- aren't hard-coded here:
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service-role-key>',        'service_role_key');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove a previous schedule if re-running this migration.
select cron.unschedule('send-bill-reminders')
where exists (select 1 from cron.job where jobname = 'send-bill-reminders');

-- Every day at 09:00 Asia/Manila (= 01:00 UTC).
select cron.schedule(
  'send-bill-reminders',
  '0 1 * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
               || '/functions/v1/send-bill-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
