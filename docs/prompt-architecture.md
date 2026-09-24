# WhatHeThinks — English evidence-led reports

Version 3 · 2026-09-24

## Product contract

Paid reports are written by DeepSeek, with Zhipu GLM as the backup. All newly generated prose is English, including the restated question. Inputs may be in another language. Original messages are shown unchanged as chat bubbles.

Since v3 a report is a story, not a form. A narrator writes to the reader in first person, by her first name when one is available, like a friend who stayed up reading her chat:
1. Title built on one central metaphor, plus a subtitle. It never contains her name, because she may share it.
2. Opening: what reading the chat was like, the metaphor, and the present moment (today's date, how long since his last message), leading into her question.
3. One chapter per period between detected turning points. Each has a date span and alternates prose with real messages shown as bubbles from both sides.
4. The moment that matters most, the strongest honest alternative reading, the overall read (answering her question), and her side.
5. One message to send, alternatives, what to avoid, what to watch for and a two-week plan. Measured tables and the weekly chart stay available below.

Positive, stable and inconclusive findings are valid. Never manufacture concern to sell a report. Free previews give one complete measured finding with actual figures.

## Free preview hook

Before paying, the preview shows the first page of her report and what else is waiting in it. Everything comes from her own chat; there are no countdowns or invented urgency.

- The first page: `POST /api/reports/:id/teaser` writes the title and opening once per unpaid report (`TEASER_SYSTEM_PROMPT`, same voice, rules and validation as the report; 75 s budget, 2,500 output tokens). The page gets the title, the first paragraph and the first 24 words of the rest; the remainder never leaves the server. After payment the full report reuses the title and opening word for word (`storyFacts.fixedOpening`, then overwritten on the server).
- Locked findings (`buildTeaserFacts`): the date things changed with one of his messages before it and a masked one after, a line he sent in several different weeks (masked), the chapter count and how many of her messages the report draws from. Masking keeps the first word and replaces the rest server-side.
- Cost guard: at most 300 openings per hour across the site (counted from `teaser_generated` events); reports older than 14 days, failed attempts and paid reports are not retried. Uploaded analysis cannot carry a teaser; only the server writes one.

## Pipeline

Browser parser → measurements, recurring lines, last messages and redacted excerpts → deterministic story facts on the server → model story → shape normalization, schema, grounding and language checks → final content checks → save.

- `src/lib/analysis/recurring.ts`, `evidence.ts`: lines one person sent almost word for word in several weeks; evidence selection (turning points and mixed signals first, then the latest exchange, recurring lines and the opening).
- `src/lib/report/story.ts`: story facts (today, his last message, chapter spans, recurring lines), strict schema and validation.
- `src/lib/server/llm-writer.ts`: live prompt, provider transport, retries and model fallback.
- `src/components/report/StorySections.tsx`: paid report presentation. Older v2 reports render with `NarrativeSections.tsx`.

The model gets the question, measured facts, story facts and up to 120 redacted excerpts with dates, weekdays and chapter ids. Only her first name is sent (the first word of her chat display name); his name never leaves the device and appears as [him]. No full export, report access token, account email or payment data is sent. Questions and excerpts are untrusted data, never instructions.

## Grounding and tone

- Real words appear through quote blocks that cite an evidence id; the page renders the stored message, so a quote can never be invented. Quote blocks citing an unknown message or one from another chapter are dropped.
- Text inside double quotes in prose must match an evidence message word for word (ignoring case and punctuation).
- Every number in prose must appear in measured facts, story facts, evidence dates or the messages themselves. The title and the next-step question, reason and how-to-ask contain no digits. Counts are computed on the server and passed as words; the model is told never to count.
- No evidence ids in prose, no mind reading ("he thinks/feels/wants" as a statement; conditionals, reported speech and "I can't tell you what he feels" are allowed), no diagnoses, accusations, probabilities, predictions or directives to leave/stay.

Automatic repairs only normalize shape or remove content: unwrap `{"text": …}` fields, split paragraph-plus-quote blocks, drop unknown keys, restore chapter ids and spans, trim excess turn evidence. Anything else goes back to the model once with specific instructions. These checks are heuristics, not proof of truth; live review with realistic fictional chats remains necessary.

## Failure behavior

DeepSeek: JSON mode, non-thinking, 8,000 output tokens, 60 s per attempt. GLM-5.3-FlashX: JSON mode, `reasoning_effort: "low"` (thinking cannot be turned off), 10,000 output tokens, 90 s per attempt. Temperature 0.8 for both. Two attempts per model within a 240 s total budget. If the model repeats or restarts its JSON, the longest complete object is used. Authentication/configuration errors fail immediately; missing API configuration blocks new checkout before payment.

No silent template fallback; invalid reports are not saved as ready. Existing Stripe fulfillment attempts a full refund on terminal failure. No message content, provider body or secret is logged. Processing is disclosed on the privacy page, which the paywall links to.

Historical reports remain readable and are not regenerated. After 30 days the stored messages are deleted; the story remains and the page says the quoted messages were removed.

## Verification

`tests/story.test.ts` covers first-name handling, story facts on synthetic chats and the fictional Emily/Jake export, repairs, and rejections (invented numbers, evidence ids, misquotes, mind reading, probabilities, accusations, names or digits in the title, non-English, missing chapters or quotes). `tests/llm-writer.test.ts` covers transport, retries and fallback with a mocked provider. Mocked tests do not establish live model quality.

Live check on the fictional export (2026-09-24, production code): DeepSeek about 12–30 s per report, GLM-5.3-FlashX about 25–55 s.

See [Cloudflare setup](deepseek-cloudflare-setup.md) for deployment and manual acceptance steps.
