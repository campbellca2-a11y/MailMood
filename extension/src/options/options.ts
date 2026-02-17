const apiBase = document.getElementById("apiBase") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

chrome.storage.sync.get({ apiBase: "http://localhost:3001" }, (data: any) => {
  apiBase.value = data.apiBase;
});

document.getElementById("save")?.addEventListener("click", () => {
  chrome.storage.sync.set({ apiBase: apiBase.value }, () => {
    statusEl.textContent = "Saved ✅";
  });
});
