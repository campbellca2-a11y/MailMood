import { initComposeWatcher } from "./composePanel";
import { initInboxWatcher } from "./inbox";

function bootstrap(): void {
  initInboxWatcher();
  initComposeWatcher();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
