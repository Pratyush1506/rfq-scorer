# Build Log

Fill this in as you go, or at the end. Keep it short — bullet points are fine.
This is read as carefully as the code.

---

## Stack

What you used and why. One line each.

- Frontend: Next.js (React) — easy to set up frontend and backend in one project, and has good support with the AI SDK by Vercel.
- Backend: Next.js API routes — same project as the frontend, so nothing extra to set up or run.
- Database: SQLite (better-sqlite3) — a single local file, no database server needed, db lives in the code.
- LLM / agent: Vercel AI SDK + Zod + Gemini (free) - simple way to make one LLM call and get structured output back using Zod. 

---

## Scoring approach

How does your agent arrive at a number? What did you do to make that number
mean something?

---
- v0 - LLM Picks the score
    - one llm call with system prompt of rules + plus rfq markdown + vendor profile
    - mandatory fail → score ≤ 40, required items weigh most, preferred is a bonus
    - Zod forced the output: score (0–100), 3 reasons, 2 gaps.
- v1 
    - built a checklist from the RFQ JSON (mandatory, required, technical + delivery, preferred) and sent it with the RFQ markdown
    - one gemini calls labels each check list with met, not met and partially met
    - divided the scoring weight among required, technical and preferred as 40, 40, 20.
    - score: met 1×, partial 0.5×, not met 0× of the item's share
    - Mandatory fails → score × 0.4 (max 40)

## What you built

What works. Be specific.

---
  - UI (single page):
      - pick an RFQ from a dropdown
      - paste a vendor profile or upload a .txt / .md file (rejects empty, >200 KB or binary files)
      - result shows score (colour-coded), 3 reasons and 2 gaps
      - past evaluations listed below, most recent first

- Backend:
      - API to list RFQs, run an evaluation, and list past evaluations
      - one Gemini call per evaluation; the score is calculated in code
      - Used Zod for structured output
- DB (SQLite):
      - stores the RFQs and every evaluation with its score, reasons, gaps and breakdown
      - set up and seeded automatically on first run


## What you skipped

What you consciously left out, and why.

---
- different file format for input like pdf. 
- handling edge case like, input is not valid


## Where the spec was unclear

Anything ambiguous, contradictory, or underspecified. What did you assume,
and what did you do about it?

---
- 3 reasons and 2 gaps - what if a vendor does not have the real strength or the gaps.
- description about Tool usage - i didn't use any, could use to validate rfq against real world data if required.
- Used Gemini (Flash) for the free tier. The downside is a 20 requests/day limit, which I hit during testing.


## What broke

Something that did not work first time. What was it, how did you diagnose it,
how did you fix it?

---
- Api requests were failing. Checked the gemini dashboard and generated new api keys for this as they were failing because of rate limit

## Working with AI

We expect you used AI assistants. This section is about how you worked with
them, not whether you did.

- Which tools you used, and roughly how you split the work with them:
- Something your AI assistant got wrong that you caught and corrected:
- Something you decided to write yourself rather than generate, and why:

---
- I used claude code for the development and other ai models for discussing the scoring logic approaches for this.
- Tech stack and setting up the project.

## Weakest part of this code

The thing you would be least comfortable defending. Be specific — name the
file or function.

---
- handling the inputs - invalid input, just a "hello" word would still make a call to the model with failed output or zero score.
- individual functions edge cases and error handling - didn't perform unit and sanity test on individual functions, can break under expected response

## Next 48 hours

If you had two more days, what is the first thing you would change?
- I would focus on the scoring logic here more example - right now the mandatory check drops the score, it should disqualify it.
- add quantity and material to the checklist
- support multiple file formats, like pdf, word
- Improve system prompt with example and define stricter rule for the requirements example - add examples and stricter rules to the system prompt for each requirement, so the supporting reasons and gaps come out clearer and more accurate.
