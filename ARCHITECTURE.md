# MailMood — System Architecture

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        GMAIL WEB UI                             │
│                                                                 │
│  ┌─────────────────────┐       ┌──────────────────────────┐    │
│  │   INBOX VIEW        │       │   COMPOSE VIEW           │    │
│  │                     │       │                          │    │
│  │  Subject ● [badge]  │       │  ┌────────────────────┐  │    │
│  │  Subject ● [badge]  │       │  │  Draft text area   │  │    │
│  │  Subject ● [badge]  │       │  └────────────────────┘  │    │
│  │                     │       │  ┌────────────────────┐  │    │
│  │  Hover → tooltip    │       │  │  TONE PANEL        │  │    │
│  │  (confidence +      │       │  │  Tone: Warm 🟡     │  │    │
│  │   explanation)      │       │  │  Joy 72% Trust 58% │  │    │
│  └─────────┬───────────┘       │  │  [Rewrite] [Send]  │  │    │
│            │                   │  └────────┬───────────┘  │    │
│            │                   └───────────┼──────────────┘    │
└────────────┼───────────────────────────────┼──────────────────┘
             │                               │
     ┌───────▼───────────────────────────────▼───────┐
     │           CONTENT SCRIPTS (TypeScript)         │
     │                                                │
     │  inbox-watcher.ts    compose-watcher.ts        │
     │  - MutationObserver  - MutationObserver        │
     │  - Extract previews  - Debounced input watch   │
     │  - Inject badges     - Inject tone panel       │
     └──────────────────────┬─────────────────────────┘
                            │ chrome.runtime.sendMessage
                            │
     ┌──────────────────────▼─────────────────────────┐
     │         BACKGROUND SERVICE WORKER               │
     │                                                 │
     │  worker.ts                                      │
     │  - Receives messages from content scripts       │
     │  - Calls API (fetch)                            │
     │  - Returns results                              │
     │  - Handles offline fallback                     │
     └──────────────────────┬─────────────────────────┘
                            │ HTTP (localhost:3100)
                            │
     ┌──────────────────────▼─────────────────────────┐
     │              EXPRESS API SERVER                  │
     │                                                 │
     │  POST /api/analyze                              │
     │  ← { text }                                     │
     │  → { tone, emotions[], confidence, explanation } │
     │                                                 │
     │  POST /api/rewrite                              │
     │  ← { text, targetTone }                         │
     │  → { rewritten, tone, explanation }             │
     │                                                 │
     │  ┌───────────────────────────────────┐          │
     │  │  ToneAnalyzer (rule-based engine) │          │
     │  │  - Keyword lexicons per emotion   │          │
     │  │  - Negation handling              │          │
     │  │  - Intensity scoring              │          │
     │  │  - Process-and-forget (no storage)│          │
     │  └───────────────────────────────────┘          │
     └─────────────────────────────────────────────────┘
```

## Privacy Model

```
  Email text ──→ [In-memory analysis] ──→ Result JSON ──→ Discard text
                  No database
                  No logging of content
                  No third-party calls
                  Stateless request/response
```

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `content/inbox-watcher.ts` | Observe Gmail inbox DOM, extract subject/preview, inject mood badges |
| `content/compose-watcher.ts` | Observe compose window, debounce input, inject tone panel |
| `content/ui.ts` | Render badges, tooltips, and tone panels into Gmail DOM |
| `background/worker.ts` | Proxy API calls, handle offline fallback, manage extension messaging |
| `api/tone-analyzer.ts` | Rule-based emotion detection with keyword lexicons |
| `api/routes/analyze.ts` | POST /api/analyze — tone analysis endpoint |
| `api/routes/rewrite.ts` | POST /api/rewrite — email rewrite endpoint |
