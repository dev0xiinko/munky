"use client";

import { useEffect, useState } from "react";
import { mono } from "./ui";

const DISMISS_KEY = "cf_a2hs_dismissed";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export default function InstallHint() {
  const [mode, setMode] = useState<"hidden" | "ios" | "prompt">("hidden");
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari non-standard flag
      window.navigator.standalone === true;
    if (standalone) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    if (isIOS) {
      setMode("ios");
      return;
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setMode("prompt");
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (mode === "hidden") return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setMode("hidden");
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: "calc(100px + env(safe-area-inset-bottom))",
        zIndex: 45,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(26,28,26,0.92)",
        border: "1px solid #2E312E",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        animation: "cfSlide .3s ease",
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 9, flex: "none", background: "#6F9E7E", display: "flex", alignItems: "center", justifyContent: "center", color: "#0E0F0E", fontWeight: 800, fontSize: 18 }}>
        ₱
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Install CashflowOS</div>
        <div style={{ fontSize: 11.5, color: "#9BA09B", marginTop: 1 }}>
          {mode === "ios" ? (
            <>
              Tap <span style={{ ...mono, color: "#8FC4A0" }}>Share</span> → <span style={{ color: "#E8EAE8" }}>Add to Home Screen</span>
            </>
          ) : (
            "Add to your home screen for full-screen, offline use."
          )}
        </div>
      </div>
      {mode === "prompt" && (
        <div className="cf-tap" onClick={install} style={{ flex: "none", fontSize: 12.5, fontWeight: 700, color: "#0E0F0E", background: "#6F9E7E", borderRadius: 9, padding: "7px 12px", cursor: "pointer" }}>
          Install
        </div>
      )}
      <div className="cf-tap" onClick={dismiss} style={{ flex: "none", color: "#6B706B", fontSize: 18, lineHeight: 0, cursor: "pointer", padding: 4 }}>
        ×
      </div>
    </div>
  );
}
