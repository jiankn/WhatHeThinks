# WhatHeThinks — Prompt Architecture

**Version:** v1.0 · **Date:** 2026-09-18
**Current decision:** For MVP, `ReportWriter` uses a **mock implementation** (deterministic templates). This document defines the interfaces, data contracts, and prompts so a real LLM can be swapped in later **without changing the frontend or data model**.

---

## 1. Principles

1. **Facts come from the engine; the AI only interprets.** Every number, date, and percentage must come directly from `analysis_json`. The LLM may not compute or invent numbers.
2. **The model sees excerpts, not the whole chat.** Input = aggregated metrics + turning points + ≤120 evidence messages (already anonymized to You/Him).
3. **Structured output.** Every stage outputs JSON that is validated against a schema; a failed validation triggers a retry, and if that fails, the stage falls back to mock templates.
4. **Claim Checker is the last gate.** Whether the output comes from the mock or a real LLM, it goes through the same checks.

## 2. Pipeline (mapped to BP §45)

```text
[Browser] Parser → Normalize → Metrics → Sessions → Trends → Turning Points → Evidence selection
                                                                  │  (derived data + excerpts)
[Server]  ReportWriter:
   Stage A  Signal Classification   (per excerpt: label the signal type)       ← mock: lexicon hit results are used directly
   Stage B  Turning Point Narration (per turning point: explain the change)    ← mock: templates + driver metrics
   Stage C  Report Synthesis        (6 modules)                                ← mock: templates + rules
   Stage D  Claim Checker           (deterministic, no LLM)
```

## 3. Interfaces

```ts
// lib/report/types.ts
interface ReportInput {
  question: QuestionId;            // one of the 8 questions
  analysis: Analysis;              // full output of signal-scoring-spec
  evidence: EvidenceMsg[];         // { id, ts, sender: 'Y'|'H', text }
}

interface Claim {
  fact: string;                    // observable fact, must contain a number/date/quote
  interpretation?: string;         // hedged interpretation (may/could/suggests)
  confidence: 'high'|'medium'|'low';
  metrics?: Record<string, number>;
  evidenceIds: number[];           // must be a subset of the input evidence
}

interface FullReport {
  summary: { headline: string; paragraphs: string[]; claims: Claim[] };           // M1
  interest: { level: 'strong'|'moderate'|'mixed'|'low'; dimensions: Dim[]; note: string; claims: Claim[] }; // M2
  investment: { rows: InvestRow[]; takeaway: string; claims: Claim[] };           // M3
  timeline: { points: TPNarrative[]; claims: Claim[] };                           // M4
  mixedSignals: { interest: Claim[]; distance: Claim[]; combination: string };    // M5
  nextStep: { question: string; why: string; howToAsk: string };                  // M6
  meta: { writer: 'mock'|'llm'; model?: string; version: string };
}

interface ReportWriter { write(input: ReportInput): Promise<FullReport> }
```

Implementations: `MockReportWriter` (MVP) → later `LLMReportWriter(provider)`. The `provider` is a thin wrapper (`complete({system, messages, schema}) → json`), so it isn't tied to any particular vendor.

## 4. Mock implementation rules (MVP)

- **M1 Summary:** pick 1 of 3 opening templates based on `question` (interest / change / investment), then fill in the headline turning point driver, interest level, and investment comparison
- **M2 Interest:** level + one sentence for each of the 5 sub-dimensions (sentence template chosen by high/medium/low of the sub-dimension score, with numbers filled in)
- **M3 Investment:** each row "You X% · Him Y%"; the takeaway is chosen by the gap (<10% "fairly balanced", 10–25% "you're carrying more of the conversation", >25% "most of the effort is coming from you")
- **M4 Timeline:** each turning point = "Around {date}, his {top driver} went from {before} to {after}." + comparison sentences for the other 2 drivers + context (whether she took on more initiation) + "This shift started before…" (if `conflictDate` exists)
- **M5 Mixed:** each rule has a fixed fact template + interpretation template; the combination is chosen by the number of hits in each column
- **M6 Next:** a question template table keyed by the top mixed signal / headline driver, for example:
  - `flirt_no_plans` → "Ask for something specific: 'I'd like to actually see you — are you free Thursday?'"
  - initiation cooling → "Ask directly: 'I've noticed things feel different lately — is something going on on your end?'"

Templates live in `src/lib/report/mock-writer.ts`, with 2–3 variants for key sentences, chosen deterministically by a hash of reportId (so the wording doesn't feel identical across users, while the same report always gets the same output).

## 5. LLM prompts (for later; kept here so we don't have to design them again)

### 5.0 Shared system prompt

```text
You are the analysis writer for WhatHeThinks, a service that helps women understand
observable texting patterns with a man they are dating.

Voice: a smart, calm friend with receipts. Direct, supportive, evidence-led,
a little warm. Never dramatic or alarmist.

Hard rules:
- You analyze texting BEHAVIOR, not his mind. Never claim to know what he thinks or feels.
- Every number, percentage and date you write must appear verbatim in the provided DATA.
  Never compute, round differently, or invent numbers.
- Separate FACT (what the data shows) from INTERPRETATION (what it may mean).
  Interpretations use hedged language: "may", "could", "is consistent with".
- Always acknowledge offline factors are invisible to this analysis when interpreting a change.
- Never: diagnose (narcissist, avoidant, gaslighting), accuse (cheating, lying),
  predict outcomes or give probabilities of the relationship, tell her to leave or stay,
  or say "he loves you" / "he doesn't care".
- Cite evidence only by the provided message ids.
- Output JSON only, matching the schema.
```

### 5.1 Stage A — Signal Classification (small model, batched)

Input: 20–40 evidence messages per batch (with 1 message of context before and after). Output per message:
```json
{ "id": 18221, "labels": ["plan_concrete"|"plan_vague"|"deflection"|"warmth"|"dry"|"repair"|"support"|"conflict"|"busy_excuse"|"flirt"|"none"], "note": "≤12 words" }
```
Purpose: correct lexicon false positives/negatives (e.g. sarcastic "cute"). **Stage A results can only lower or confirm the confidence of a lexicon signal; they can't create a new metric.**

### 5.2 Stage B — Turning Point Narration (main model, one call per turning point)

Input DATA: `TurningPoint` (before/after/drivers/context/conflictDate) + evidence messages for that point + Stage A labels.
Output: `TPNarrative { title, fact, interpretation, offlineCaveat, evidenceIds[≤5] }`.

### 5.3 Stage C — Report Synthesis (main model, one call)

Input DATA: question, interest level and sub-dimension scores, investment table, all TPNarratives, mixed signal hits, evidence subset.
Output: the full `FullReport` JSON (timeline reuses Stage B's output).
Key prompt instructions:
- M1 opens by answering the question the user selected, in 1 sentence
- M6 gives exactly one question she can ask him directly, plus one sentence on why that question and one sentence on how to phrase it

### 5.4 Model and cost (estimated at launch; decide model IDs when integrating)

| Stage | Model tier | Est. input tokens |
|---|---|---|
| A | Small/fast | ~8k (120 messages) |
| B | Main model | ~2k × ≤5 |
| C | Main model | ~10k |

Keep cost per report ≤ $0.15 (≤1.5% of the $9.99 price).

## 6. Claim Checker (deterministic, required)

Every piece of text in `FullReport` is checked:

1. **Number check:** extract every number/percentage/date from the text and require that each one appears in `analysis` (allowed formatting differences: 0.48 ↔ 48%, date format). Fail → drop that claim (LLM mode: retry once first)
2. **Evidence check:** `evidenceIds ⊆ input evidence`, and each claim `fact` must have a number, a date, or ≥1 evidence (BP §55 Risk 2)
3. **Banned language** (regex, case-insensitive), on a hit replace with a template or drop:
   `\b(definitely|certainly|100%|guaranteed)\b`, `cheat(ing)?`, `narcissis`, `gaslight`, `avoidant`, `sociopath|psychopath`, `\brun\b[.!]`, `he (loves|doesn't love|does not love) you`, `\d+% chance`, `(will|going to) (break up|fail|end)`, `(leave|dump) him`, `he (thinks|feels|wants) ` (a mind-reading assertion, unless preceded by "he said")
4. **Interpretation hedge check:** interpretation must contain `may|might|could|can|suggest|consistent with|one possible|often|tend` (implemented in `src/lib/report/claim-checker.ts`)
5. **Tone:** exclamation marks ≤ 1 per module; no ALL CAPS words (except the turning point headline)

## 7. Question → emphasis mapping

| QuestionId | M1 opening focus | Module order change |
|---|---|---|
| `likes_me` | Interest level | Default |
| `losing_interest` | Headline cooling point | M4 moved to position 2 |
| `energy_changed` | Headline turning point | M4 moved to position 2 |
| `mixed_signals` | Mixed signal hits | M5 moved to position 2 |
| `more_invested` | Investment comparison | M3 moved to position 2 |
| `situationship` | Planning + Follow-through | M2, M5 first |
| `ex_came_back` | The latest `warming` point + disappear_return | M4 moved to position 2 |
| `custom` | Generic summary; the question text is shown at the top of the report (MVP doesn't answer it specifically; that's handed to P1 Follow-up) | Default |

## 8. Versioning and regression

- `meta.version` records the template/prompt version; after a change, regression-test on a fixed set of synthetic chats (≥10) and compare Claim Checker pass rates
- Log only reportId, stage, latency, token counts, and pass/fail. **Never log message text**
