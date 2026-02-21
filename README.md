# MailMood

Emotional intelligence for Gmail. Injects mood badges into the inbox and a live tone panel into the compose window — all processed locally with zero data retention.

## Architecture

```
extension/          Chrome MV3 extension (TypeScript → esbuild)
  src/
    content/        Inbox badge injector + compose panel
    lib/            Local analyzer & rewriter (self-contained, no network)
    background.ts   Service worker — routes messages to local lib/
    constants.ts    Tone colors, Gmail CSS selectors
    types.ts        Shared types

api/                Optional Express backend (TypeScript, port 8787)
  src/
    analyzer.ts     Lexicon-based tone engine (520 lines)
    rewrite.ts      Tone-targeted rewriter
    app.ts          POST /analyze, POST /rewrite, GET /health
```

The extension works fully offline via `lib/` (local fallback). The `api/` is only needed if you want server-side analysis or to run the test suite against HTTP endpoints.

## Extension Setup

```bash
cd extension
npm install
npm run build        # outputs to extension/dist/
```

Load unpacked in Chrome:
1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select `extension/dist/`

Development (auto-rebuild on save):
```bash
npm run build -- --watch
```

## API Setup (optional)

```bash
cd api
npm install
npm run dev          # Express server @ localhost:8787
```

Health check: `GET http://localhost:8787/health`

Endpoints:
- `POST /analyze` — `{text: string}` → `{toneLabel, confidence, explanation, emotions[]}`
- `POST /rewrite` — `{text: string, targetTone?: string}` → `{original, rewritten, strategy}`

## Docker (API only)

```bash
docker compose up --build
```

## Tests

```bash
cd api && npm test        # analyzer, rewriter, HTTP endpoint tests
cd extension && npm test  # local fallback tests
```

## Features

- **Inbox mood badges** — color-coded pill next to each subject line; hover for confidence % and explanation
- **Compose tone panel** — real-time tone detection while writing; draggable, minimizable
- **Rewrite suggestions** — one-click tone adjustment (e.g. urgent → calm/professional)
- **Six tones** — Calm/Professional, Warm/Positive, Urgent/Tense, Apologetic/Anxious, Neutral/Automated, Sad/Concerned
- **Privacy model** — process-and-forget; no email text is stored or transmitted externally
- **Privacy policy** — https://campbellca2-a11y.github.io/MailMood/privacy.html

## Tone Colors

| Tone | Color |
|---|---|
| Calm / Professional | `#2e7d32` (green) |
| Warm / Positive | `#ef6c00` (orange) |
| Urgent / Tense | `#c62828` (red) |
| Apologetic / Anxious | `#6a1b9a` (purple) |
| Neutral / Automated | `#607d8b` (blue-grey) |
| Sad / Concerned | `#1565c0` (blue) |
