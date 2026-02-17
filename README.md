# MailMood

Production-grade MVP for MailMood: a browser extension that adds emotional intelligence to email.

## Quick Start

### Backend
```bash
cd backend
npm install
# create a .env file with OPENAI_API_KEY and TONE_MODEL=hybrid
npm run dev
```

### Extension
```bash
cd extension
npm install
npm run build
```

Load the extension as an unpacked extension:
- Chrome/Edge: `chrome://extensions`
- Firefox: `about:debugging`

## Features
- Inbox mood indicators
- Compose tone panel with rewrite
- Hybrid tone analysis (local + OpenAI)
- Gmail + Outlook support

## Docker
```bash
docker-compose up --build
```
