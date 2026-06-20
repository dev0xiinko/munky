// Supabase Edge Function — daily bill email reminders (§8 server side).
// Invoked by a daily Cron (see supabase/migrations/0002_bill_reminders_cron.sql).
//
// Deploy:
//   supabase functions deploy send-bill-reminders
//   supabase secrets set RESEND_API_KEY=re_xxx REMINDER_FROM="CashflowOS <bills@yourdomain.com>"
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount_centavos: number;
  due_day: number;
  reminder_days_before: number;
  active: boolean;
  status: string;
  deleted_at: string | null;
}

const peso = (c: number) => "₱" + Math.round(c / 100).toLocaleString("en-US");

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Current-cycle due date for an unpaid bill (this month's occurrence, clamped).
// Past due day → overdue for this cycle, not rolled forward.
function nextDueDate(dueDay: number, today: Date): Date {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const day = Math.min(dueDay, new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
  return new Date(Date.UTC(y, m, day));
}

const daysBetween = (a: Date, b: Date) =>
  Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);

function shouldRemind(b: Bill, today: Date): { remind: boolean; label: string; days: number } {
  const due = nextDueDate(b.due_day, today);
  const days = daysBetween(due, today);
  let label = "";
  if (days < 0) label = "overdue";
  else if (days === 0) label = "due today";
  else if (days === 1) label = "due tomorrow";
  else if (days === b.reminder_days_before) label = `due in ${days} days`;
  return { remind: label !== "", label, days };
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("REMINDER_FROM") ?? "CashflowOS <onboarding@resend.dev>";

    const today = new Date();

    const { data: bills, error } = await supabase
      .from("bills")
      .select("id,user_id,name,amount_centavos,due_day,reminder_days_before,active,status,deleted_at")
      .eq("active", true)
      .is("deleted_at", null)
      .neq("status", "paid");
    if (error) throw error;

    // Group reminders by user.
    const byUser = new Map<string, { name: string; amt: number; label: string }[]>();
    for (const b of (bills ?? []) as Bill[]) {
      const { remind, label } = shouldRemind(b, today);
      if (!remind) continue;
      const list = byUser.get(b.user_id) ?? [];
      list.push({ name: b.name, amt: b.amount_centavos, label });
      byUser.set(b.user_id, list);
    }

    if (byUser.size === 0) {
      return Response.json({ ok: true, sent: 0, note: "no reminders due" });
    }

    // Resolve emails.
    const userIds = [...byUser.keys()];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,email")
      .in("id", userIds);
    const emailOf = new Map((profiles ?? []).map((p) => [p.id, p.email as string | null]));

    let sent = 0;
    for (const [userId, items] of byUser) {
      const email = emailOf.get(userId);
      if (!email) continue;

      const rows = items
        .map((i) => `<tr><td style="padding:6px 0;">${i.name}</td><td style="padding:6px 0;color:#6F9E7E;">${i.label}</td><td style="padding:6px 0;text-align:right;font-weight:700;">${peso(i.amt)}</td></tr>`)
        .join("");
      const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;">
        <h2 style="margin:0 0 4px;">Upcoming bills</h2>
        <p style="color:#666;margin:0 0 16px;">You have ${items.length} bill(s) needing attention.</p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
      </div>`;

      if (!resendKey) {
        console.log(`[dry-run] would email ${email}:`, items);
        sent++;
        continue;
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: email, subject: "CashflowOS — upcoming bills", html }),
      });
      if (res.ok) sent++;
      else console.error("resend error", res.status, await res.text());
    }

    return Response.json({ ok: true, sent, users: byUser.size });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
