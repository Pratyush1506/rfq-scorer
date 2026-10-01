# Build Log

Fill this in as you go, or at the end. Keep it short — bullet points are fine.
This is read as carefully as the code.

---

## Stack

What you used and why. One line each.

- Frontend: Next.js (React) — easy to set up frontend and backend in one project, and has good support with the AI SDK.
- Backend: Next.js API routes — same project as the frontend, so nothing extra to set up or run.
- Database: SQLite (better-sqlite3) — a single local file, no database server needed.
- LLM / agent: Vercel AI SDK + Zod + Gemini (free) - simple way to make one LLM call and get structured output back. 

---

## Scoring approach

How does your agent arrive at a number? What did you do to make that number
mean something?

---
- v0 - i prepared a system prompt with set of rules, the user input and the rfq doc and instructed it to just give the score
- v1 
    - used the rfq.json, and firsrt preaprae a check list consisting madatory, requried, technical, and preffered.
    - used llm to label each requirment
    - calculated score with the response from the llm
    - point share for each - requried - 40, Technical - 40, Preferred - 20
    - if mandotry fails it drops the score by 40%

## What you built

What works. Be specific.

---
- UI - RFQ options can be slected, user can upload md or text or paste the text in the UI
- backend - the system then scores it against the rfqs making an llm call and gives the output in UI with score and reasons and gaps
- DB - for storing the results



## What you skipped

What you consciously left out, and why.

---
- differnt file format for input like pdf. 
- handling edge case like, input is not valid


## Where the spec was unclear

Anything ambiguous, contradictory, or underspecified. What did you assume,
and what did you do about it?

---
- 3 reasons and 2 gaps - what if a vendor does not have the real strength or the gaps.
- description about Tool usage - i didn't use any
- Which LLm to use, i used gemini as it was free but has req limit


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
- handling the inputs - invalid input, just a "hello" word would still make a call to the model with failed output or zero score
- individual functions edge cases and error handling

## Next 48 hours

If you had two more days, what is the first thing you would change?
- i would focus on the scoring logic here more.
- understand the rafq docs sturcutre and cover edge cases and make the system handle any type of vendor profile
- add multiple file format options
- support reasoning and gaps logic
