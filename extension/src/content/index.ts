import { injectMailMoodUI } from './composePanel';
import { injectPills } from './inbox';

// This ensures both the Inbox and the Compose window are checked every time Gmail shifts
const observer = new MutationObserver(() => {
  injectMailMoodUI(); 
  injectPills();      
});

observer.observe(document.body, { childList: true, subtree: true });