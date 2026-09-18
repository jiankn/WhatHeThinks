# WhatHeThinks — Signal Scoring Spec

**Version:** v1.0 · **Date:** 2026-09-18
**Scope:** All the deterministic computation that runs in the browser (no LLM). The output of this document is the only factual input for the report. The AI layer may only interpret it, never invent anything.

Throughout: `Y` = You (the user), `H` = Him. All thresholds live in `lib/analysis/config.ts` so they can be tuned in one place.

---

## 1. Parser

### 1.1 Normalization

1. Strip `‎ ‏ ‪-‮ ﻿`; replace `   ` with a normal space
2. Normalize line endings to `\n`

### 1.2 Line formats (matched by regex, in priority order)

| Name | Example |
|---|---|
| iOS | `[1/15/24, 9:41:05 PM] Jake: hey` |
| iOS 24h | `[15.01.24, 21:41:05] Jake: hey` |
| Android | `1/15/24, 9:41 PM - Jake: hey` |
| Android 24h | `15/01/2024, 21:41 - Jake: hey` |

Date separators `/ . -`; year 2 or 4 digits; seconds optional; AM/PM optional (case-insensitive, `a.m.` also accepted).

- A line that doesn't match the header regex → **continuation line**, appended to the previous message's text with `\n`
- A header with no `Name:` → **system message** (e.g. "Messages and calls are end-to-end encrypted", "X changed the group name"), discarded
- **Date order detection:** scan all headers. If the first field is > 12 anywhere → D/M; if the second field is > 12 anywhere → M/D; if both are ≤ 12 everywhere → `ambiguous`, default M/D, and let the user switch in the UI

### 1.3 Message types

| type | Rule |
|---|---|
| `text` | Normal |
| `media` | `<Media omitted>`, `image omitted`, `video omitted`, `sticker omitted`, `GIF omitted`, `audio omitted`, `document omitted`, `Contact card omitted` |
| `deleted` | `This message was deleted`, `You deleted this message` |
| `call` | `Missed voice call`, `Missed video call`, `Voice call`, `Video call` |

`<This message was edited>` → strip the marker and keep it as text.
media/call **count toward activity** (initiation, reply) but not toward length or questions. deleted counts toward nothing.

### 1.4 Output

```ts
type Msg = { id: number; ts: number /* epoch ms, local time treated as UTC */; sender: string; text: string; type: 'text'|'media'|'deleted'|'call' }
```

Timestamps are exported in the phone's local time with no time zone, so **we treat them as UTC throughout** and only format them for display, which avoids time zone shifts.

### 1.5 Participants

- Count messages by sender. **2 people** → the UI asks "Which one is you?" (default guess: the sender who appears first in the file is not automatically assumed to be anyone; the user must pick)
- **> 2 people** → the user picks You and Him; other people's messages are dropped
- The mapping replaces real names with `Y/H`; real names never leave the browser

---

## 2. Sessions (BP §18)

- `SESSION_GAP = 6h`: if the gap between two adjacent messages is ≥ 6h, a new session starts
- **Session start** `initiator` = the sender of the session's first message
- **Re-engagement:** the initiator of a session that follows a gap ≥ 48h
- **Overnight gap:** a gap that spans 00:00–06:00 and is < 12h is labeled `overnight` (still splits a session, but doesn't count as "long silence")
- **Long silence:** gap ≥ 72h
- **Session closing:** the sender of the last message in a session; "who says the last word" is a secondary metric

## 3. Base metrics (computed per person, over the whole range and per week)

| Metric | Definition |
|---|---|
| `msgCount` | text+media+call messages |
| `words` / `avgLen` | word count of text messages (whitespace split; emojis count as 1 each) / average characters per message |
| `initiationShare` | sessions this person started ÷ total sessions (excluding `overnight`-split sessions, to avoid "good morning" inflating the count; overnight sessions are counted separately as `morningStarts`) |
| **Reply latency** | Group consecutive messages from the same sender into a **turn**. When the other person's turn follows within `SESSION_GAP`, latency = the other person's first message time − this turn's last message time. Report P50/P75/P90 per person |
| `unanswered` | Turns with no reply before the session ends |
| `questionRatio` | text messages containing a question ÷ text messages. Question = contains `?` or starts with (what/when/where/why/how/who/do/does/did/are/is/can/could/would/will/wanna/want to)+space and length ≤ 200 |
| `ignoredQuestions` | A question turn with no reply from the other person before the session ends |
| `doubleText` | This person sends another message ≥ 30min after their own message with no reply in between |
| `activeDays` | Number of distinct days with a message |

## 4. Lexicon signals

Each lexicon lives in `lib/analysis/lexicons.ts`, as regexes with word boundaries, case-insensitive. Hits carry a `msgId` and can serve as evidence.

### 4.1 Planning
- **Plan proposal:** `let's|lets|wanna|want to|we should|come over|pick you up|are you free|free (on|this|tonight|tomorrow)|how about|down to|you up for` + an activity word (`dinner|drinks|coffee|lunch|movie|date|hang|meet|see you|come over|walk|brunch|concert|show`) or a time word
- **Time words:** `tonight|tomorrow|this (weekend|week|friday…)|next (week|weekend|mon…sun)|mon…sun(day)?|\d{1,2}(:\d2)?\s?(am|pm)|at \d`
- `concretePlan` = a proposal + a time word in the same message, **or** a proposal whose next 3 messages contain a time word
- `vaguePlan` = a proposal without a time word (`we should hang out sometime`)
- `planCancel` = `rain check|can't make it|cancel|reschedule|something came up|raincheck|another time`

### 4.2 Warmth
- `affection`: `miss you|thinking (about|of) you|can't wait|cant wait|babe|baby|beautiful|gorgeous|cute|xo|love (that|you)` + emojis `❤️🥰😘😍💕💖😻🫶`
- `laughter`: `haha+|lol|lmao|😂|🤣`
- `apology` (repair): `sorry|my bad|i apologize|didn't mean` 
- `support`: `how are you feeling|hope you're ok|proud of you|you got this|here for you|how did (it|the) .* go`
- `busyExcuse`: `busy|swamped|crazy (day|week)|long day|so tired|exhausted`

### 4.3 Low effort
- `dryReply`: text messages with ≤ 2 words that aren't a question and aren't a laughter-only reply (e.g. `ok`, `nice`, `lol ok`, `yeah`, `k`, `cool`)

Output per person, per week: the rate of each signal (hits ÷ that person's text messages that week) + absolute count.

## 5. Weekly series and indexes

### 5.1 Weekly buckets

Bucket by ISO week (Monday start). Weeks where the two people together sent < 10 messages are marked `sparse` and excluded from change-point scoring (still drawn on the chart).

H's weekly metric vector:
`initShare, replyP50(log), questionRatio, msgShare (H messages ÷ total), avgLen, plansPerWeek, warmthRate, dryRate`

### 5.2 Engagement Index (H only, used to find turning points)

For each metric, compute a z-score against **H's own** full-range mean and standard deviation (not against a population), then combine with weights:

| Metric | Weight | Direction |
|---|---|---|
| initShare | 0.25 | + |
| replyP50 (log) | 0.20 | − (slower = lower) |
| questionRatio | 0.15 | + |
| msgShare | 0.15 | + |
| plansPerWeek | 0.10 | + |
| warmthRate | 0.10 | + |
| dryRate | 0.05 | − |

`EI_week = Σ w·dir·z`, then smooth with a 3-week rolling mean (7/14/30-day windows ≈ 1/2/4 weeks; the chart can switch between them).

## 6. Turning Point Engine (BP §20)

**Candidate points:** the start of each non-sparse week `t`, requiring ≥ 3 valid weeks before and after.

**Score:** compare the 4-week windows before and after `t` (uses everything available if < 4 weeks, minimum 3):
- For each metric, compute a standardized difference `d_m = (mean_after − mean_before) / pooled_sd` (Cohen's d; if sd≈0, use 0.1× the full-range mean as the floor)
- `shift(t) = Σ w_m · dir_m · d_m` (same weights as §5.2)

**Selection:**
1. Take the point with the largest `|shift|` over the whole range. If `|shift| ≥ 0.8`, it becomes a turning point
2. Split the timeline at that point, and recurse on each side (binary segmentation) to find more points
3. Stop when there are 5 points, or no point with `|shift| ≥ 0.8` remains; turning points must be ≥ 3 weeks apart
4. **Precise date:** within ±7 days of the selected week, use a 7-day rolling window to find the day with the largest single-day change in H's initiation share / message volume, and use that as the `date` for "around May 18"

**Direction:** `shift < 0` → `cooling`, `> 0` → `warming`.

**Confidence:**

| Level | Condition |
|---|---|
| high | `|shift| ≥ 1.5` and ≥ 3 metrics with `|d| ≥ 0.8` in the same direction and messages in both windows ≥ 150 |
| medium | `|shift| ≥ 1.0` and ≥ 2 metrics in the same direction |
| low | Everything else that passed the threshold (shown in the preview but not as the headline) |

**Output:**

```ts
type TurningPoint = {
  id: string; date: number; direction: 'cooling'|'warming'; confidence: 'high'|'medium'|'low';
  shift: number;
  before: MetricSnapshot; after: MetricSnapshot;   // H's metrics + Y's metrics as a control
  drivers: { metric: string; before: number; after: number; d: number }[]; // top 3 by |d|
  evidenceIds: number[];
  context: { yInitShareBefore: number; yInitShareAfter: number } // did she take on more of the effort
}
```

**Headline turning point (the one the preview uses):** the high/medium `cooling` point with the most negative `shift`. If there isn't one, use the high/medium point with the largest `|shift|`. If there are none at all, the preview says "His pattern has been fairly consistent" (that's also a valuable conclusion, and it still sells the full report).

**"This shift started before..." (BP §7.3):** check whether there are ≥ 3 conflict-lexicon hits (`why do you|you never|you always|we need to talk|are you mad|whatever|fine\.|forget it`) within ±21 days of the turning point. If so, record the earliest conflict date `conflictDate` and whether `date < conflictDate`, for the report to use.

## 7. Interest Level (BP §22, module 2)

Scoring is based on H's **last 6 valid weeks** (or everything, if shorter). Each of 5 sub-dimensions gets a 0–1 score:

| Sub-dimension | Calculation (sigmoid-mapped to 0–1) |
|---|---|
| Initiative | H initiationShare; 0.5 → 0.5, ≥0.5 → high |
| Curiosity | H questionRatio relative to Y (ratio H/Y) and absolute value ≥ 0.15 |
| Engagement | H replyP50 relative to Y + avgLen relative to Y + msgShare |
| Planning | H concretePlans/week (≥1 → high) + share of plans H initiated |
| Follow-through | Proportion of H's concrete plans **not** followed by planCancel within 7 days; if H has < 2 plans, mark `insufficient` |

Total score `S` = mean of the valid sub-dimensions. Checked in order:
1. `S ≥ 0.7` → **Strong**
2. `0.35 ≤ S < 0.7` and sub-dimension max − min ≥ 0.45 (some high, some low) → **Mixed**
3. `S ≥ 0.45` → **Moderate**
4. Otherwise → **Low**
If the recent trend is cooling (headline turning point in the last 8 weeks), add a tag: `trend: declining`.

**Never output a percentage "love score."** The UI shows only the level + sub-dimension bars.

## 8. Mixed Signals Rules (BP §19)

Each rule is computed over the last 8 weeks, and every hit must come with evidence:

| id | Rule | Trigger |
|---|---|---|
| `flirt_no_plans` | High flirting + no plans | H warmthRate ≥ Y warmthRate × 0.8 and H concretePlans ≤ 1 over 8 weeks |
| `replies_never_initiates` | Replies often, never initiates | H replyP50 ≤ 30min and H initiationShare ≤ 0.25 |
| `disappear_return` | Disappears, then returns intensely | ≥ 2 times: H silent ≥ 72h, then H initiates a session with message count ≥ 1.5× the median session |
| `words_vs_followthrough` | Warm words, low follow-through | H affection hits ≥ 3 and Follow-through ≤ 0.4 |
| `vague_plans` | Only vague plans | H vaguePlan ≥ 3 and concretePlan = 0 |
| `late_night_only` | Mostly active late at night | ≥ 50% of H's initiations are between 22:00 and 03:00 |
| `busy_pattern` | Repeated "busy" excuses | H busyExcuse ≥ 4 (8 weeks) and H initiationShare is declining |

Each hit is also categorized as a `signalsOfInterest` or `signalsOfDistance` evidence item, which feeds the two-column display.

**Breadcrumbing pattern** = `disappear_return` + (`vague_plans` or `flirt_no_plans`) hit together. Tagged, but the copy only says "a pattern consistent with breadcrumbing"; it never delivers a verdict.

## 9. Evidence selection (BP §21)

Budget ≤ 120 messages, each ≤ 280 characters (truncated with an ellipsis). Allocation:

1. For each turning point: 6 messages before and 6 after (prioritizing H's initiations, H's dry replies, conflict lexicon hits, and plan/cancel messages) — up to 5 points × 12 = 60
2. For each mixed signal rule hit: 3–5 representative messages
3. For each interest sub-dimension: 2 representative messages
4. Fill the remaining budget with a small amount of surrounding context (1 message before and after each selected message) so the AI can read the context

Every claim in the report references `evidenceIds` from this set.

## 10. Preview data (not an AI output; generated directly by the engine)

```ts
type Preview = {
  totalMessages: number; activeDays: number; range: [number, number];
  initiation: { you: number; him: number };
  medianReply: { you: number; him: number }; // minutes
  headline: { date: number; metric: 'initiation'|'reply'|'volume'; sentence: string } | null;
  counts: { turningPoints: number; mixedSignals: number; evidence: number; shifts: number };
  liteMode: boolean;
}
```

The `headline.sentence` template comes from the driver with the largest |d| in the headline turning point:
- initiation → "His conversation initiation began dropping around {date}."
- reply → "His replies started getting noticeably slower around {date}."
- volume → "His share of the conversation started shrinking around {date}."
- warming → "His effort noticeably increased around {date}."

## 11. Test requirements

- **Parser fixtures:** iOS 12h/24h, Android 12h/24h, D/M dates, multi-line messages, media/deleted, U+202F, group chats
- **Synthetic data generator** `scripts/synth.ts`: parameterized generation of "H's initiation/reply/length degrades in week X". Acceptance criteria:
  - Planted cooling point detected within ±7 days with confidence ≥ medium
  - Chats with no planted change produce no high turning point (false positive rate < 10% over 100 random seeds)
- Performance: 20k messages full pipeline < 1.5s (Node benchmark)
