# WhatHeThinks — English evidence-led reports

Version 2 · 2026-09-22

## Product contract

Paid reports use DeepSeek. All newly generated prose is English, including the restated question, observations, interpretation, limits and suggested message. Inputs may be in another language. Original evidence remains unchanged in the evidence drawer.

Reading order:
1. Answer the selected or custom question directly.
2. Explain the strongest supporting evidence.
3. Weigh genuine contrary evidence, likely misreadings and missing context.
4. Offer one natural question, why/how to ask, and behavior to watch afterward.
5. Let the reader explore measurements and timelines, ordered by report focus.

Positive, stable and inconclusive findings are valid. Never manufacture concern to sell a report. Free previews give one complete measured finding with actual figures. Purchase copy follows the saved question and explains English output and timestamp-free limits.

## Pipeline

Browser parser → measurements and redacted excerpts → deterministic server data → DeepSeek narrative → schema/language/grounding checks → final content checks → save.

- `src/lib/server/llm-writer.ts`: live prompt, provider transport, retries and model fallback (DeepSeek first, then GLM).
- `src/lib/report/narrative.ts`: strict schema, measured fact catalog and validation.
- `src/lib/report/mock-writer.ts`: deterministic data and legacy/sample compatibility, never a provider fallback.
- `src/components/report/NarrativeSections.tsx`: paid report presentation.

One main call, at most one correction/retry. The model gets the question, measured facts and up to 120 redacted excerpts. No full export, report access token, account email or payment data is sent. Questions and excerpts are untrusted data, never system instructions.

## Grounding and tone

Numerical observations reference a real fact ID and copy the entire measured sentence verbatim. This prevents reassigning a valid number to another metric or person. Qualitative observations must cite supplied message IDs. No digits outside copied facts. Tables, chart series, counts, scores and timeline dates never come from the model.

State observable patterns directly; qualify inferred motives without mechanically repeating may/could. Do not diagnose, accuse, predict romantic success, read minds, manipulate, or dictate whether to leave/stay. Explain contrary evidence when present; when absent, explain the sample's limits. No forced balance.

English-only prompting is backed by language metadata, script screening and language identification on combined prose and longer fields. The strict schema bounds fields and rejects extras. These are fallible heuristics, not a mathematical guarantee of language or truth. Valid message IDs do not prove semantic entailment. Live quality review with realistic fictional chats remains necessary.

## Failure behavior

Fixed DeepSeek endpoint, JSON mode, non-thinking mode, output cap 5,000 tokens, response cap 150 KB and timeout 45 seconds per attempt. At most two attempts. Authentication/configuration errors fail immediately; missing API configuration blocks new checkout before payment.

No silent template fallback; invalid reports are not saved as ready. Existing Stripe fulfillment attempts a full refund on terminal failure. UI offers a new free preview and support contact rather than unlimited regeneration of a refunded order. No message content, provider body or secret is logged. Processing is disclosed on the paywall and privacy page.

Historical reports remain readable and are not regenerated. Samples remain explicitly fictional.

## Verification

`tests/deepseek.test.ts` tests English validation, Chinese/Spanish rejection, forged facts/evidence, unknown fields, unsafe advice, missing keys, provider errors, malformed/truncated responses, correction and timeout. Ten synthetic chat variants cover timestamps and lite mode. Tests use a mocked provider; they do not establish live model quality.

See [Cloudflare setup](deepseek-cloudflare-setup.md) for deployment and manual acceptance steps.
