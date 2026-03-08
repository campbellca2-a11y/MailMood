"use strict";

const keyInput = document.getElementById('apiKey') as HTMLInputElement;
const saveBtn = document.getElementById('save') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLElement;

// Load current key
chrome.storage.local.get(['geminiApiKey'], (res) => {
  if (res.geminiApiKey) keyInput.value = res.geminiApiKey;
});

// Save key
saveBtn.onclick = () => {
  const key = keyInput.value.trim();
  
  if (!key) {
    status.style.color = '#b91c1c';
    status.textContent = '❌ Please enter a key.';
    return;
  }

  chrome.storage.local.set({ 'geminiApiKey': key }, () => {
    status.style.color = '#15803d';
    status.textContent = '✅ Key securely saved! Refresh Gmail.';
    setTimeout(() => { status.textContent = ''; }, 3000);
  });
};