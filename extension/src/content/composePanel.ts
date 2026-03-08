export function injectMailMoodUI() {
  // Gmail formatting bar container(s)
  const toolbars = document.querySelectorAll(".btC");

  toolbars.forEach((toolbar) => {
    if (toolbar.querySelector(".mailmood-optimize-btn")) return;

    const btn = document.createElement("button");
    btn.className = "mailmood-optimize-btn";
    btn.innerText = "✨ MailMood Polish";
    btn.type = "button";
    btn.style.cssText = `
      background: #1a73e8 !important; color: white !important;
      border: none !important; padding: 0 16px !important;
      height: 36px !important; border-radius: 18px !important;
      font-weight: 500 !important; cursor: pointer !important;
      margin-left: 10px !important; z-index: 999 !important;
    `;

    btn.onclick = () => {
      const container = toolbar.closest(".M9") as HTMLElement | null;
      if (!container) return;

      // 1-use-per-compose guard
      if (container.getAttribute("data-mailmood-polish-used") === "1") {
        alert("MailMood Polish: already used once for this draft.");
        return;
      }

      // Try the existing selector first; fall back to role textbox
      const textBox =
        (container.querySelector(".Am.Al.editable") as HTMLElement | null) ||
        (container.querySelector("div[role='textbox'][g_editable='true']") as HTMLElement | null);

      if (!textBox) return;

      const originalText = textBox.textContent || "";
      if (!originalText.trim()) return;

      const originalLabel = btn.innerText;
      btn.innerText = "Polishing…";
      btn.disabled = true;

      chrome.runtime.sendMessage(
        { type: "MM_POLISH", text: originalText },
        (response: any) => {
          // Support both response shapes: {ok:true,data} and {success:true,data}
          const ok = response?.ok === true || response?.success === true;

          if (ok) {
            const polished = typeof response?.data === "string" ? response.data : "";
            if (polished) {
              textBox.textContent = polished;
              container.setAttribute("data-mailmood-polish-used", "1");
            } else {
              alert("MailMood Polish failed: empty result.");
            }
          } else {
            alert(response?.error || "MailMood Polish failed.");
          }

          btn.disabled = false;
          btn.innerText = originalLabel;
        }
      );
    };

    toolbar.appendChild(btn);
  });
}