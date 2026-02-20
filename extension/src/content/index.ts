import { initComposeWatcher } from "./composePanel";
import { initInboxWatcher } from "./inbox";
import { SELECTORS } from "../constants";

// ---------------------------------------------------------------------------
// Selector health check — Gmail obfuscates its CSS classes and rotates them
// without notice. If our key selectors stop matching, inject a visible warning
// so the user knows MailMood is disconnected rather than silently broken.
// ---------------------------------------------------------------------------
const HEALTH_CHECK_DELAY_MS = 4000; // give Gmail time to fully render

function runHealthCheck(): void {
  const rows = document.querySelectorAll(SELECTORS.inboxRow);
  if (rows.length > 0) return; // all good

  // No rows matched — Gmail may have changed its DOM structure
  const existing = document.getElementById("mm-health-warning");
  if (existing) return; // already shown

  const warning = document.createElement("div");
  warning.id = "mm-health-warning";
  warning.title = "MailMood: Gmail's layout may have changed. Mood badges are currently unavailable.";
  warning.style.cssText = [
    "position:fixed",
    "bottom:16px",
    "right:16px",
    "z-index:99999",
    "background:#b71c1c",
    "color:#fff",
    "font-size:12px",
    "font-family:Google Sans,Roboto,sans-serif",
    "font-weight:600",
    "padding:8px 14px",
    "border-radius:8px",
    "box-shadow:0 4px 12px rgba(0,0,0,0.3)",
    "cursor:pointer",
    "user-select:none",
  ].join(";");
  warning.textContent = "⚠️ MailMood: Gmail layout changed — badges unavailable";
  warning.addEventListener("click", () => warning.remove());
  document.body.appendChild(warning);

  // Auto-dismiss after 10 seconds
  setTimeout(() => warning.remove(), 10_000);
}

function bootstrap(): void {
  initInboxWatcher();
  initComposeWatcher();
  setTimeout(runHealthCheck, HEALTH_CHECK_DELAY_MS);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
