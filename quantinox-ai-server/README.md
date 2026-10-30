# Quanta AI server

> **v6 note:** the new `quantinox-backend` already includes Quanta AI (same answers, plus feedback stored in the admin dashboard). Use this stand-alone server only if you want the AI on a different machine from the backend.

This small server switches the website assistant (Quanta AI) from **site guide** mode to **full AI** mode.
It answers visitors with Claude, using your own website text as its knowledge, and streams the answer as it is written.

You do **not** need this server for the assistant to work: without it, Quanta AI still answers from your website pages, books demos, takes call-back requests, recommends packages and estimates savings.

## What it does

- Finds the most relevant passages from your website for each question, then asks Claude to answer **only from those passages**.
- Replies in English or Hindi, following the visitor.
- Can add buttons under its answer: book a demo, request a call back, package finder, savings estimate, or a link to one of your pages (links to other websites are blocked).
- Will not invent prices, customers, certifications or dates; offers to connect the visitor with your team instead.
- Protects your costs: per-visitor limit (12 messages a minute) and a daily cap (3,000 messages), both adjustable.
- Saves thumbs-up and thumbs-down ratings to `feedback.log`, so you can see which answers to improve.
- Your API key stays on this server and is never sent to the browser.

## 1. Get a Claude API key

Create an account and an API key at https://console.anthropic.com. Add a payment method and, ideally, a monthly spend limit.

The default model is **Claude Haiku 5.5** (`claude-haiku-5-5`), the fastest and lowest-cost model. For richer answers, set `ASSISTANT_MODEL=claude-sonnet-5-5`. Check current prices at https://platform.claude.com/docs/en/models/overview.

## 2. Run it

You need Node.js 18 or newer. There is nothing to install.

```bash
cp .env.example .env      # then edit .env: API key, your website address
node server.js
```

Check it works: open `http://localhost:8787/health`. You should see `"configured": true` and a number of passages.

## 3. Put it online

Any host that runs Node.js works, for example Render, Railway, Fly.io, a VPS, or the same server as your Quantinox backend.

- **Start command:** `node server.js`
- **Environment variables:** the same ones as in `.env.example` (set them in the host's dashboard; do not upload `.env`).
- Give it its own address, for example `https://ai.yourdomain.com`.

## 4. Switch the website to AI mode

In the website's `assets/js/config.js`:

```js
assistantEndpoint: "https://ai.yourdomain.com",
```

Upload `config.js`. The assistant header now shows **AI** instead of **Site guide**. If the server is ever unreachable, the assistant automatically falls back to site-guide answers.

## Keeping its knowledge up to date

The website folder contains `tools/build-assistant-kb.py`. After you change page text, run it from the website folder:

```bash
python3 tools/build-assistant-kb.py
```

It updates `assets/js/assistant-kb.js` (used by site-guide mode) and `assets/data/assistant-knowledge.json`. Upload both. With `KNOWLEDGE_URL` set, this server downloads the new knowledge within an hour (or immediately when restarted).

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/assistant` | Chat. Body: `{ messages: [{role, content}], lang: "en"|"hi", page: {file, title} }`. Response: Server-Sent Events with `text`, `action`, `sources`, `done` or `error`. |
| `POST` | `/api/assistant/feedback` | Thumbs up/down: `{ rating: "good"|"bad", question, answer, page, lang }` |
| `GET` | `/health` | Status, model, number of passages |
