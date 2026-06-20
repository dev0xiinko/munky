# CashflowOS — Supabase backend

## 1. Database schema + RLS
Run these migrations **in order** in the SQL editor (or `supabase db push`):

1. `migrations/0001_init.sql` — core tables, RLS (`auth.uid() = user_id`),
   profile-on-signup trigger.
2. `migrations/0003_ledgers.sql` — `income_transactions` + `bill_payments`.
3. `migrations/0004_bill_type.sql` — `bills.bill_type` + `term_months`.
4. `migrations/0005_savings_contributions.sql` — `savings_contributions` ledger.
5. `migrations/0006_bill_start_date.sql` — `bills.start_date`.

0001 + 0003–0006 are **all required** for sync: the app writes rows whose
columns these create, so skipping any one makes that table's upserts fail
silently (the row stays queued and parks after retries).

`migrations/0002_bill_reminders_cron.sql` is **optional** — it only powers the
daily email reminders and is covered in §2 below (it needs the Edge Function +
Vault secrets first, so don't run it until then).

## 2. Bill reminder emails (Edge Function + Cron)

### Deploy the function
```bash
supabase functions deploy send-bill-reminders
```

### Set secrets
Get a [Resend](https://resend.com) API key (free tier works) and a verified
sender. Then:
```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set REMINDER_FROM="CashflowOS <bills@yourdomain.com>"
```
Without `RESEND_API_KEY` the function runs in **dry-run** mode (logs what it
would send) — handy for testing before wiring email.

### Schedule it
In the SQL editor, first store the URL + service-role key in Vault:
```sql
select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select vault.create_secret('<service-role-key>',        'service_role_key');
```
Then run `migrations/0002_bill_reminders_cron.sql` to create the daily job
(09:00 Asia/Manila). The job calls the function with the service-role key, so
deploy the function with JWT verification on (default) — the service-role token
satisfies it.

### Test manually
```bash
curl -i -X POST "https://<ref>.supabase.co/functions/v1/send-bill-reminders" \
  -H "Authorization: Bearer <service-role-key>"
```
Returns `{ ok, sent, users }`. A bill triggers a reminder when it is active,
unpaid, and `reminder_days_before` / 1 / 0 days from its next due date, or
overdue.

## Reminder logic
- **Browser notifications** (client, no server needed): enable from the Bills
  screen. Fires on app open/focus, deduped per bill per due-cycle.
- **Email** (this function): a daily digest of the same windows, per user.
