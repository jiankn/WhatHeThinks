# WhatHeThinks — PRD (MVP P0)

**Version:** v1.0 · **Date:** 2026-09-18 · **Upstream doc:** Business Plan V4
**Related docs:** [signal-scoring-spec.md](signal-scoring-spec.md) · [prompt-architecture.md](prompt-architecture.md) · [keyword-research.md](keyword-research.md)

---

## 1. Goals and non-goals

**Goal:** Ship a web product that a woman can use on her phone: upload a WhatsApp chat, **see a free preview that proves "it actually knows what happened in our chat"**, then pay $9.99 to unlock the full report with timeline and evidence.

**Launch success criterion:** First 20 paying customers. North star metric = Preview → Paid.

**Out of scope for MVP:** iMessage, Deep Dive, actually generating paid follow-up answers (P1; MVP only has the CTA and a waitlist), PDF export, share cards, accounts/login, subscriptions, multiple languages, screenshot OCR.

## 2. Key decisions (confirmed)

| Item | Decision |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Deployment | Cloudflare Workers (via `@opennextjs/cloudflare`) |
| Database | Cloudflare D1 (report metadata, derived data, orders) |
| Raw chat | **Parsed only in the browser and never uploaded** (no R2 needed for MVP) |
| AI | Implement the `ReportWriter` interface with a **mock (template-based) implementation** first; swap in a real LLM later |
| Payment | Stripe Checkout (test mode) + webhook |
| Email | Resend (test mode; env vars are placeholders) |
| Accounts | None. Report access = unguessable reportId + access token |

## 3. User flow

```text
Landing / Money Page
   ↓ [Analyze Our Chat]
/analyze
   Step 1  Choose your question (8 options, §14)
   Step 2  Upload WhatsApp .txt / .zip   or   Paste conversation
           → browser Web Worker parses it
   Step 3  Identify You / Him (auto-detect 2 participants; user confirms or swaps; group chats pick 2)
   Step 4  Analyze (progress bar: Parsing → Sessions → Trends → Turning points → Evidence)
           → browser computes all deterministic metrics + candidate turning points + evidence message excerpts
           → POST /api/reports  (upload only derived data + ≤120 evidence message excerpts)
   ↓
/r/{reportId}#t={token}      Free Preview
   ↓ [Unlock Full Report — $9.99]
Stripe Checkout (collects email)
   ↓ webhook: checkout.session.completed → mark paid → generate full report → send email link
/r/{reportId}#t={token}      Full Report (6 modules + View Evidence)
   ↓
Follow-up CTA (MVP: collect the question + waitlist; ask whether this is the question they want answered)
```

## 4. Page inventory

| Route | Description |
|---|---|
| `/` | Homepage Hero (BP §10) + How it works + Sample report + Privacy block + Pricing + FAQ |
| `/analyze` | 4-step analysis flow (client-side) |
| `/r/[id]` | Preview / full report (one page that switches on paid status) |
| `/r/[id]/success` | Post-payment landing page (polls until the report is ready) |
| 7 money pages | See keyword-research §2.1, same template |
| `/who-texts-first` `/reply-time-calculator` | Free tools, run entirely client-side |
| `/privacy` `/terms` `/faq` | Required |
| `/delete` | Delete data (by reportId + token, or by the email + reportId in the email) |

## 5. Functional requirements

### 5.1 Input parsing (in the browser)

- **WhatsApp .txt:** supports iOS format `[M/D/YY, h:mm:ss AM] Name: text`, Android format `M/D/YY, h:mm AM - Name: text`, 24-hour clock, U+202F/U+200E invisible characters, multi-line messages, and system/media placeholder lines. See signal-scoring-spec §1.
- **.zip:** unzip in the browser with `fflate`, read `_chat.txt` or the first `.txt`.
- **Paste:** accepts pasted text in WhatsApp format; if there are no timestamps, fall back to "Lite mode" (no reply time or turning points; the preview says so).
- **Date format ambiguity (M/D vs D/M):** auto-detect (any first field > 12 decides it). If it can't be determined, default to M/D (US) and show a toggle on Step 3.
- **Minimum data:** < 50 messages → refuse and explain. < 21 days or < 300 messages → run the analysis, but turning points are marked "not enough history".
- **Upper limit:** 200k messages / 50 MB; parsing happens in a Web Worker so the UI doesn't freeze.

### 5.2 Deterministic analysis (in the browser)

Everything follows [signal-scoring-spec.md](signal-scoring-spec.md): sessions, initiation, reply time P50/P75/P90, message length, question ratio, double texting, plans, warmth, weekly trends, turning points, interest level, mixed signal rules, evidence candidates.

### 5.3 Upload (what leaves the browser)

`POST /api/reports` payload:
- `question`, participant aliases (**we store "You" / "Him", not real names**; names in evidence excerpts are replaced with You/Him)
- `metrics` (all aggregated numbers, weekly series)
- `turningPoints[]`, `mixedSignals[]`, `interestLevel`
- `evidence[]`: ≤120 message excerpts (each ≤280 characters, with id/timestamp/sender), chosen only from around turning points and signal hits
- **No full chat.** The privacy page states this.

### 5.4 Free Preview (BP §23)

Shown: total messages, active days, date range; initiation You/Him %; median reply You/Him; a teaser for the **largest turning point** ("His conversation initiation began dropping around May 18"); a count summary (✓ N turning points / N mixed signals / N supporting moments / interest level locked).
Locked: the paywall from BP §24 (4 locked cards + Unlock $9.99, one-time payment).

**Paywall security:** Before payment, the server returns only the preview fields. Full report content (the 6 modules, evidence) is only returned after `paid=1`.

### 5.5 Full Report (6 modules, BP §22)

1. **What the Pattern Shows** — 3–5 sentence summary, tied to the question the user selected
2. **Is He Interested?** — Strong / Moderate / Mixed / Low observable interest + 5 sub-dimensions (Initiative, Curiosity, Engagement, Planning, Follow-through)
3. **Who Is More Invested?** — side-by-side comparison bars (initiation, questions, plans, repair, re-engagement, message length)
4. **When Things Changed** — weekly trend chart + turning point cards (Before/After metric table + confidence + View Evidence)
5. **Mixed Signals** — two columns: signals of interest vs signals of distance + "What the combination suggests"
6. **What To Clarify Next** — one question worth asking him directly (no advice to break up or get back together)

Every claim displays Fact and Interpretation separately and carries at least one of Metric / Date / Evidence (BP §55 Risk 2).
**View Evidence:** opens the original message excerpts (with timestamps) behind that claim.

### 5.6 Payment

- `POST /api/checkout` → create Stripe Checkout Session (mode=payment, $9.99, metadata.reportId, collect email)
- `POST /api/stripe/webhook` → verify signature → `orders` record paid → mark report paid → call `ReportWriter` to generate the full report (mock is synchronous; switch to a Queue later) → send the report link via Resend
- If there are no Stripe keys in the env: use **dev mode** — the checkout button unlocks directly (only when `NODE_ENV=development` or `DEV_UNLOCK=1`)
- Pricing is centralized in `lib/pricing.ts` so the $9.99/$12.99 A/B test can be added later

### 5.7 Report access and deletion

- On creation, generate `reportId` (nanoid 12) + `token` (32 bytes random). The server stores only `sha256(token)`.
- The URL uses a fragment `#t=` (not sent to the server or logs); the page reads it and sends it as a request header. The token is also kept in the browser's localStorage.
- The payment email contains the full link.
- **Delete:** a "Delete everything" button at the bottom of the report page → `DELETE /api/reports/:id` (with token) → hard delete of report + evidence (orders keep only amount/time/Stripe ID for bookkeeping).
- **Auto-cleanup:** evidence excerpts are deleted after 30 days (Cron Trigger); the report keeps its structured conclusions and metrics until the user deletes it.

### 5.8 Follow-up CTA (MVP)

Below the report: "Ask one more question about this chat — $3.99". MVP collects the question text + email and records `followup_interest`. It doesn't charge yet; this validates demand (Paid → Follow-up KPI).

### 5.9 Analytics

Event tracking (self-hosted to D1 `events` table, or Plausible/Umami — **to be decided**): `landing_view`, `analyze_start`, `upload_parsed`, `preview_view`, `checkout_click`, `paid`, `followup_click`, `delete`. Covers the KPI funnel in BP §31.

## 6. Data model (D1)

```sql
reports (
  id TEXT PRIMARY KEY, token_hash TEXT, question TEXT,
  status TEXT,            -- preview | paid | generating | ready | failed
  preview_json TEXT,      -- data needed for the preview
  analysis_json TEXT,     -- full deterministic analysis result (not returned before payment)
  report_json TEXT,       -- ReportWriter output
  email TEXT, created_at INTEGER, paid_at INTEGER, evidence_expires_at INTEGER
)
evidence (report_id TEXT, msg_id TEXT, ts INTEGER, sender TEXT, text TEXT, PRIMARY KEY(report_id, msg_id))
orders (id TEXT PRIMARY KEY, report_id TEXT, sku TEXT, amount_cents INTEGER, stripe_session_id TEXT, status TEXT, created_at INTEGER)
followups (id TEXT PRIMARY KEY, report_id TEXT, email TEXT, question TEXT, created_at INTEGER)
events (id INTEGER PRIMARY KEY, name TEXT, report_id TEXT, props TEXT, ts INTEGER)
```

## 7. Privacy (BP §43–44)

- The homepage shows 5 promises: Private by default / Raw chats never uploaded / Never sold / Never used for ads / Never used for model training
- **Architectural guarantees:** full chats never leave the browser; only ≤120 excerpts are uploaded, and they are deleted after 30 days; logs never record the request body; real names are replaced with You/Him
- When a real LLM is connected: use a provider that doesn't train on API data by default, and send only the excerpts

## 8. Brand and copy rules

Voice: "Smart girlfriend with receipts" — direct, calm, supportive, evidence-led, a little playful, not alarmist. Banned language: see prompt-architecture §6 (the claim checker enforces it).

## 9. Non-functional requirements

- Mobile-first (375px); Lighthouse mobile ≥ 90 on money pages
- A 20k-message chat parses + analyzes in < 3s in the browser (mid-range phone)
- Money pages / tools use SSG; `/analyze` and `/r/*` are `noindex`
- Accessibility: charts include text equivalents

## 10. Engineering milestones (after these docs are confirmed)

| Milestone | Content | Acceptance |
|---|---|---|
| M1 | Project scaffold + parser + unit tests (multiple WhatsApp format fixtures) | Tests pass on all fixtures |
| M2 | Analysis engine (sessions/metrics/trends/turning points/mixed signals/evidence) + synthetic test data | Synthetic "cooled-off in week X" data is detected within ±7 days |
| M3 | `/analyze` flow + Preview + D1 API | Full local flow works end-to-end |
| M4 | Mock ReportWriter + full report page + evidence | All 6 modules render; the claim checker passes |
| M5 | Stripe test mode + webhook + dev unlock + deletion | Test card payment unlocks the report |
| M6 | Homepage + 7 money pages + 2 tools + Privacy/Terms/FAQ | Build passes; SEO metadata is complete |

## 11. Open questions

1. **Analytics tool:** self-hosted D1 events table (zero cost, rough) vs Plausible/Umami (hosted, costs money). Default suggestion: D1 events table first.
2. **Terms / Privacy:** I'll write a template draft, **but it needs legal review before launch** (especially since dating chat data is sensitive).
3. **Non-male partners:** the product targets women dating men, and the UI uses "He/Him". MVP doesn't support switching.
4. **Refund policy:** suggest "if the report can't be generated or the data is insufficient, automatic full refund". Needs your confirmation.
