# RFQ Vendor Scorer

Scores a vendor profile against an RFQ. Pick an RFQ, paste or upload a vendor
profile, and get a score out of 100 with three reasons and two gaps. Past
evaluations are listed below, newest first.

For how it works inside, see [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md).

## Prerequisites

- **Node.js 20.9 or newer.** Check with `node -v`.
- **A Google Gemini API key.** Get a free one at https://aistudio.google.com/apikey

## Getting started

**1. Clone the repo and install dependencies**

```bash
git clone <repo-url>
cd rfq-scorer
npm install
```

**2. Add your API key**

```bash
cp .env.example .env.local
```

Open `.env.local` and paste your key:

```
GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
```

**3. Start the app**

```bash
npm run dev
```

Open http://localhost:3000.

The database (`data/app.db`) is created and loaded with the three RFQs from
`seed/` automatically on first run. No separate step is needed.

## Using the app

1. Pick an RFQ from the dropdown.
2. Paste a vendor profile into the text box, or click **Upload .txt / .md**.
   Sample profiles are in `samples/` (`vendor-a.txt`, `vendor-b.txt`, `vendor-c.txt`).
3. Click **Evaluate** and wait a few seconds (usually 5–40).
4. Read the score, three reasons and two gaps.
5. Scroll down to see past evaluations. Click a row to expand it.

Only `.txt` and `.md` files up to 200 KB can be uploaded. For PDF or Word,
copy the text and paste it in.

## Other commands

| Command | What it does |
| --- | --- |
| `npm run seed` | Reloads the RFQs from `seed/`. Past evaluations are kept. |
| `npm run build` then `npm start` | Runs the production version. |

To start with an empty database, delete the `data/` folder and restart the app.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Your Gemini API key. |
| `GEMINI_MODEL` | No | Gemini model to use. Defaults to `gemini-3.5-flash`. Pro models have no free-tier quota. |

`.env.local` is gitignored, so your key is never committed.
