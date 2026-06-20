"use client";

import { useEffect } from "react";
import { runBillReminders } from "@/lib/notifications";
import type { Bill } from "@/types";

const HOURLY = 60 * 60 * 1000;

/**
 * Fires browser notifications for due bills when permission is granted. Checks
 * on mount, on focus/visibility, and hourly while open. No-ops without
 * permission, so it's safe to mount unconditionally.
 */
export function useBillReminders(bills: Bill[]) {
  useEffect(() => {
    if (!bills.length) return;
    const check = () => void runBillReminders(bills);

    check();
    const onFocus = () => check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(check, HOURLY);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [bills]);
}
