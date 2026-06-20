"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { mono } from "@/components/shared/ui";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    const supabase = getSupabase();
    if (!supabase || busy) return;
    setBusy(true);
    setMsg(null);
    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === "signup" && !data.session)
      setMsg("Check your email to confirm, then sign in.");
    // If a session comes back (email confirmation disabled), onAuthStateChange
    // in AuthGate signs us straight in — no email step, no email rate limit.
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px", gap: 14 }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ ...mono, fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#6F9E7E" }}>CashflowOS</div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.6px", marginTop: 6 }}>
          {mode === "signin" ? "Welcome back" : "Create account"}
        </div>
        <div style={{ fontSize: 13, color: "#9BA09B", marginTop: 4 }}>Your money, offline-first.</div>
      </div>

      <input className="cf-in" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <input className="cf-in" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />

      {msg && <div style={{ fontSize: 12.5, color: "#D08B7B", textAlign: "center" }}>{msg}</div>}

      <div
        className="cf-tap"
        onClick={submit}
        style={{ textAlign: "center", padding: 15, borderRadius: 13, cursor: "pointer", fontWeight: 700, fontSize: 15, background: busy ? "#242724" : "#6F9E7E", color: busy ? "#5E635E" : "#0E0F0E" }}
      >
        {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
      </div>

      <div
        className="cf-tap"
        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}
        style={{ textAlign: "center", fontSize: 13, color: "#9BA09B", cursor: "pointer", padding: 4 }}
      >
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </div>
    </div>
  );
}
