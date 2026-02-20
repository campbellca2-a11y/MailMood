# MailMood — Complete Project Handoff Prompt

Copy everything below this line and paste it into ChatGPT or Claude to continue working on MailMood.

---

## Who You Are

You are helping me bring **MailMood** to the Chrome Web Store as a free v1.0 release. You are a senior full-stack developer with Chrome extension experience. Be direct, avoid over-engineering, and only make changes that are necessary. Ask me before making architectural decisions.

## What MailMood Is

MailMood is a Chrome extension that adds emotional intelligence to Gmail. It does two things:

1. **Inbox mood badges** — small colored labels appear next to email subjects showing the detected tone (Calm/Professional, Warm/Positive, Urgent/Tense, Apologetic/Anxious, Sad/Concerned, Neutral/Automated).
2. **Compose tone panel** — a floating, draggable panel appears when composing an email. It analyzes your draft in real-time as you type (500ms debounce), shows the detected tone with confidence %, lists emotion breakdowns, and offers a "Rewrite" button that suggests a softened/improved version you can apply with one click.

**Privacy model**: "Process-and-forget." Email text is sent to the API, analyzed using deterministic keyword lexicons (no ML, no external AI), and immediately discarded. Nothing is stored, logged, or sent to third parties.

## Current Architecture

```
Gmail (browser)
  ↓ content scripts inject into Gmail DOM
Chrome Extension (Manifest V3)
  ├── content/index.ts → bootstraps inbox watcher + compose watcher
  │     ├── inbox.ts → MutationObserver watches inbox rows, extracts subject+preview,
  │     │              sends MM_ANALYZE via chrome.runtime.sendMessage, renders badges
  │     └── composePanel.ts → watches for compose dialogs, creates floating panel,
  │                           sends MM_ANALYZE on input (500ms debounce), MM_REWRITE on button click
  ├── background.ts → service worker, receives MM_ANALYZE/MM_REWRITE messages,
  │                    proxies to localhost:8787 API, 8-second timeout
  ├── lib/localFallback.ts → basic keyword-match fallback when API is unreachable
  ├── options/ → simple settings page for API base URL
  └── content/styles.css → all badge and panel styling
           ↓
Express API (localhost:8787)
  ├── analyzer.ts → deterministic tone analyzer with:
  │     - 6 lexicon categories (urgent, apologetic, warm, calm, sad, automated)
  │     - ~40-60 terms per category with weighted multi-word phrases
  │     - Negation detection (5-word window, punctuation barriers)
  │     - Intensity modifiers (amplifiers: very/extremely, dampeners: slightly/somewhat)
  │     - Sentence-level scoring with position weighting (opening 1.3x, closing 1.2x)
  │     - Punctuation/formatting signals (caps ratio, exclamation density, ellipsis)
  │     - Email structure detection (greeting, sign-off, forwarded, short)
  │     - Dynamic human-readable explanations
  ├── rewrite.ts → rule-based rewriter (softener + warmth injection + capitalization)
  ├── app.ts → Express app with helmet, cors, /health, /analyze, /rewrite endpoints
  └── index.ts → entry point, listens on PORT env var or 8787
```

## Tech Stack

- **Extension**: TypeScript, Manifest V3, esbuild bundler (via `scripts/bundle.mjs`)
- **API**: TypeScript, Express 4, Helmet, CORS, tsx (dev), vitest (tests)
- **Build**: `node scripts/bundle.mjs` for extension, `npm run dev` (tsx watch) for API
- **No external AI dependencies** — all analysis is deterministic keyword/rule-based

## Current State (as of February 2026)

### What Works
- Extension loads in Chrome (developer mode, load unpacked from `MailMood/extension/`)
- API runs locally (`cd MailMood/api && npm run dev` → localhost:8787)
- Inbox badges appear on Gmail emails with correct tone colors
- Compose panel appears, analyzes drafts in real-time, shows tone + emotions
- Rewrite feature suggests softened versions of drafts
- Local fallback activates when API is unreachable
- Message protocol between content scripts and background worker is aligned (MM_ANALYZE, MM_REWRITE)
- CSS is included in manifest via content_scripts declaration
- Options page builds and loads correctly

### Bugs Fixed in This Session
1. **Options page missing from dist** — bundle.mjs wasn't copying options.html and options.css to dist/. Fixed by adding copy commands to the `copyStatic()` function.
2. **Message type mismatch** — Content scripts sent `MM_ANALYZE`/`MM_REWRITE` but background.ts listened for `ANALYZE_TONE`/`REWRITE`. Fixed background.ts to match.
3. **Payload shape mismatch** — Content scripts sent `{ type, payload: { text } }` but background read `message.text`. Fixed to read `message.payload.text`.
4. **CSS not declared in manifest** — Added `"css": ["dist/content/styles.css"]` to the content_scripts block.

### Known Issues That Need Fixing Before Store Submission

**Blocking:**

1. **Backend requires localhost** — The extension defaults to `http://localhost:8787`. Store users won't have this running. Options:
   - **(Recommended) Make local fallback the primary/only mode** — Move the full analyzer logic into the extension itself (it's pure TypeScript, no server dependencies). The API becomes optional for power users. This eliminates the hosting requirement entirely.
   - OR deploy the API to a hosted service (Railway, Fly.io, Vercel) with HTTPS.

2. **Unused permissions in manifest** — `activeTab` and `scripting` are declared but never used. Google will flag this during review. Remove them.

3. **Extra host permissions** — Outlook domains (`outlook.office.com`, `outlook.live.com`) are declared but there's no Outlook support in the code. Remove for v1.0.

4. **No extension icons** — Need 16x16, 32x32, 48x48, 128x128 PNG icons.

5. **No privacy policy** — Chrome Web Store requires a publicly accessible privacy policy URL. The content is straightforward (process-and-forget, no storage, no third parties) but needs to exist as a hosted page.

6. **No store listing assets** — Need 2-3 screenshots (1280x800 PNG) showing badges in inbox and compose panel in action.

7. **`npm run build` doesn't work for extension** — It runs `tsc` instead of the esbuild bundler. Either fix the script to run `node scripts/bundle.mjs` or document that the correct build command is `node scripts/bundle.mjs`.

**Non-blocking but should fix:**

8. **Options page default URL inconsistency** — `options.ts` defaults to `localhost:3001`, `background.ts` defaults to `localhost:8787`. Should match.

9. **Firefox placeholder ID** — `manifest.json` has `mailmood@example.com` in browser_specific_settings. Remove for Chrome-only v1.0 or replace with real ID.

10. **Version number** — Currently 0.2.0. Should bump to 1.0.0 for store release.

11. **No Content Security Policy** in manifest — should add one.

12. **No rate limiting** on API calls from content scripts — could spam backend on large inboxes.

## File Structure

```
MailMood/
├── api/
│   ├── src/
│   │   ├── index.ts          # Entry point, starts Express on port 8787
│   │   ├── app.ts            # Express app setup (helmet, cors, routes)
│   │   ├── analyzer.ts       # Core tone analyzer (lexicons, negation, scoring)
│   │   ├── rewrite.ts        # Draft rewriter (softener, warmth, capitalization)
│   │   └── types.ts          # Shared types (ToneLabel, AnalyzeResponse, etc.)
│   ├── package.json          # Dependencies: express, cors, helmet, tsx, vitest
│   └── tsconfig.json
├── extension/
│   ├── manifest.json         # Source manifest (Manifest V3)
│   ├── scripts/
│   │   └── bundle.mjs        # esbuild bundler (builds dist/, copies static assets)
│   ├── src/
│   │   ├── background.ts     # Service worker (proxies messages to API)
│   │   ├── constants.ts      # TONE_META colors/labels, Gmail DOM selectors
│   │   ├── types.ts          # TypeScript types shared across extension
│   │   ├── content/
│   │   │   ├── index.ts      # Bootstrap (inits inbox + compose watchers)
│   │   │   ├── inbox.ts      # Inbox badge injection via MutationObserver
│   │   │   ├── composePanel.ts # Floating compose analysis panel
│   │   │   └── styles.css    # All extension CSS
│   │   ├── lib/
│   │   │   └── localFallback.ts # Basic keyword fallback when API is down
│   │   └── options/
│   │       ├── options.html   # Settings page markup
│   │       ├── options.css    # Settings page styles
│   │       └── options.ts     # Settings page logic (save/load API URL)
│   ├── dist/                  # Built output (generated by bundle.mjs)
│   │   ├── manifest.json
│   │   ├── background.js
│   │   ├── content/
│   │   │   ├── index.js
│   │   │   └── styles.css
│   │   └── options/
│   │       ├── options.html
│   │       ├── options.css
│   │       └── options.js
│   └── package.json          # Dev deps: typescript, @types/chrome, vitest
└── docker-compose.yml        # Docker setup for API (not needed for extension-only)
```

## How to Run Locally (Fresh Start)

```bash
# Terminal 1 — API
cd MailMood/api
npm install
npm run dev
# Should print: MailMood API listening on http://localhost:8787

# Terminal 2 — Build extension
cd MailMood/extension
npm install
node scripts/bundle.mjs
# Should print: [mailmood] Build complete.

# Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the MailMood/extension/ folder (root, not dist/)
# 5. Open Gmail — badges should appear, compose panel should activate
```

## Tone Categories

| Label | Display Name | Color | Typical Signals |
|-------|-------------|-------|-----------------|
| calm_professional | Calm / Professional | #2e7d32 (green) | "please review", "at your convenience", greeting+signoff |
| warm_positive | Warm / Positive | #ef6c00 (orange) | "thanks", "great job", "appreciate", "excited" |
| urgent_tense | Urgent / Tense | #c62828 (red) | "ASAP", "deadline", "immediately", caps, exclamation marks |
| apologetic_anxious | Apologetic / Anxious | #6a1b9a (purple) | "sorry", "my fault", "worried", ellipsis |
| sad_concerned | Sad / Concerned | #1565c0 (blue) | "unfortunately", "condolences", "regret to inform" |
| neutral_automated | Neutral / Automated | #607d8b (grey) | "unsubscribe", "noreply", "do not reply", system patterns |

## Business Context

- **v1.0 will be free** — goal is to reach ~500 active users for real-world feedback before considering monetization
- **Target users**: professionals who write a lot of email and want to be more intentional about tone
- **Store review focus**: Google reviewers check policy compliance (permissions, privacy, no deceptive behavior), NOT product quality or accuracy
- **No external AI services** — this is a selling point for privacy-conscious users

## What I Need Help With

Help me work through the known issues list above to get MailMood ready for Chrome Web Store submission. The biggest architectural decision is item #1 (localhost backend vs bundled analyzer). I'm leaning toward bundling the analyzer directly into the extension so there's zero server dependency for v1.0, with the hosted API as a future enhancement.

Start by asking me which issue I'd like to tackle first, or recommend a priority order.
