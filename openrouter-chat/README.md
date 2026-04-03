# OpenRouter Dashboard Chat

Next 15 chat app that sends prompts to OpenRouter and injects one full dashboard HTML file into the first model-visible user message.

## What It Does

- Creates a fresh chat session via `POST /api/session`
- Sends prompts to OpenRouter through `@openrouter/sdk`
- Injects `../HTMLDASH/WB Dashboard.html` once per session
- Persists session state in `.sessions/*.json`
- Streams assistant replies to the browser over SSE

## Environment

Copy `.env.example` into `.env`, or use the workspace root `.env`.

Required:

- `OPENROUTER_API_KEY`

Defaults:

- `OPENROUTER_MODEL=qwen/qwen3.6-plus:free`
- `OPENROUTER_SITE_URL=http://localhost:8012`
- `OPENROUTER_SITE_NAME=WB Dashboard Chat`
- `PORT=8012`

Optional overrides:

- `SESSIONS_DIR`
- `DASHBOARD_HTML_PATH`

## Commands

```bash
npm install
npm run dev
```

Build and start:

```bash
npm run build
npm start
```

Node tests:

```bash
npm run test:node
```
