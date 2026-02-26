// Copyright (c) 2026 Bill Campbell. All rights reserved.
// MailMood — https://github.com/campbellca2-a11y/MailMood
// Licensed under the Business Source License 1.1. See LICENSE for details.
const apiBase = document.getElementById("apiBase") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

chrome.storage.sync.get({ apiBase: "http://localhost:8787" }, (data: any) => {
  apiBase.value = data.apiBase;
});

document.getElementById("save")?.addEventListener("click", () => {
  chrome.storage.sync.set({ apiBase: apiBase.value }, () => {
    statusEl.textContent = "Saved âœ…";
  });
});
