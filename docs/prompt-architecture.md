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

- The first page: `POST /api/reports/:id/teaser` writes the title, opening, every chapter heading and the full first chapter once per unpaid report (`teaserPrompt`, same voice, rules and validation as the report; 110 s budget, 4,000 output tokens). The page gets the opening and a little over half of the first chapter; the rest never leaves the server. After payment the full report reuses all of it word for word (`storyFacts.fixedOpening`, filled back in on the server before validation).
- Prompts are built per chat (`reportPrompt` / `teaserPrompt`): only the rules that apply (thematic or timed chapters, lite mode, repeated lines, what she already read). Judgement rules come first; rules code can check are stated once and enforced by validation, which sends the exact failures back on a retry.
- Each evidence message carries `repeats` when the same person sent it more than once (counted over the whole chat in the browser), so the model cannot present a weekly routine as a one-off. Validation rejects "the only time / broke the pattern" claims next to such messages, repeated sentences, and a weekday that does not match its date.
- Locked findings (`buildTeaserFacts`): the date things changed with one of his messages before it and a masked one after, a line he sent in several different weeks (masked), the chapter count and how many of her messages the report draws from. Masking keeps the first word and replaces the rest server-side.
- The whole report is written before payment. Once the opening is settled, the preview page calls `POST /api/reports/:id/prepare` without waiting for it. It writes the full report (reusing the opening) through the same validation and final checks, and stores it in `report_json` while the report is still unpaid. `toView` only returns report content once the report is paid and ready, so nothing leaks before payment. When it's ready, the preview shows only the chapter titles, the number of quoted messages, the suggested message masked after its first word, and "Your full report is already written".
- On payment, if a report was written for the current focus it is published at once (`generate_from_pregen`). If it's still being written, payment waits up to 90 s for it; otherwise it generates as before. Changing the focus clears it; a failed pre-write is not retried and payment generates as before. Dates in the opening are not refreshed: the chat and the reading do not change if she pays days later. At most 150 pre-writes per hour across the site; above that, payment generates as before.
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

Automatic repairs only normalize shape or remove content: strip Markdown emphasis, unwrap `{"text": …}` fields, split paragraph-plus-quote blocks, drop unknown keys, restore chapter ids and spans, trim excess turn evidence, close a paragraph block the model left open. Sentence-level problems (an unsupported number, mind reading, odds, accusations, all caps, a misquote) remove only the offending sentence; a paragraph block or message option left empty is dropped. This came from a live failure: one sentence per attempt was enough to reject four complete reports in a row and refund the order. Problems that can't be fixed by removal (title, chapter structure, too few quotes, language, a single-sentence field) go back to the model once with specific instructions.

Mind-reading rules exempt negated disclaimers ("I can't tell you what he feels"), conditionals ("if he wants"), reported speech ("he replied that he feels it too") and open questions ("you want to know whether he wants…"). Direct statements about his inner life are still rejected. Times already agreed in the messages ("Saturday at 2") may appear in the suggested message; only the shareable title must have no digits. These checks are heuristics, not proof of truth; live review with realistic fictional chats remains necessary.

## Failure behavior

DeepSeek: JSON mode, non-thinking, 8,000 output tokens, 60 s per attempt. GLM-5.3-FlashX: JSON mode, `reasoning_effort: "low"` (thinking cannot be turned off), 10,000 output tokens, 90 s per attempt. Temperature 0.8 for both. Two attempts per model within a 240 s total budget. If the model repeats or restarts its JSON, the longest complete object is used. Authentication/configuration errors fail immediately; missing API configuration blocks new checkout before payment.

No silent template fallback; invalid reports are not saved as ready. Existing Stripe fulfillment attempts a full refund on terminal failure. No message content, provider body or secret is logged. Processing is disclosed on the privacy page, which the paywall links to.

Historical reports remain readable and are not regenerated. After 30 days the stored messages are deleted; the story remains and the page says the quoted messages were removed.

## Verification

`tests/story.test.ts` covers first-name handling, story facts on synthetic chats and the fictional Emily/Jake export, repairs, and rejections (invented numbers, evidence ids, misquotes, mind reading, probabilities, accusations, names or digits in the title, non-English, missing chapters or quotes). `tests/llm-writer.test.ts` covers transport, retries and fallback with a mocked provider. Mocked tests do not establish live model quality.

Live check on the fictional export (2026-09-24, production code): DeepSeek about 12–30 s per report, GLM-5.3-FlashX about 25–55 s.

See [Cloudflare setup](deepseek-cloudflare-setup.md) for deployment and manual acceptance steps.
