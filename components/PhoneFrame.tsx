import type { ReactNode } from "react";

/**
 * App shell wrapper. On a real phone — and any narrow viewport or installed
 * PWA — the app fills the screen edge-to-edge (safe-area insets are handled by
 * the shell chrome). On wide screens it renders a cosmetic iOS device frame so
 * the PWA still previews nicely on desktop. The mobile/desktop switch and all
 * styling live in globals.css (.cf-stage / .cf-device / .cf-viewport / .cf-notch).
 */
export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="cf-stage">
      <div className="cf-device">
        <div className="cf-notch" />
        <div className="cf-viewport">{children}</div>
      </div>
    </div>
  );
}
