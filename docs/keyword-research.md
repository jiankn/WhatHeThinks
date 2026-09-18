# WhatHeThinks — Keyword Research

**Version:** v1.0 · **Date:** 2026-09-18 · **Upstream doc:** Business Plan V4 §32–§40, §61

> ⚠️ **About the data:** This version has no Ahrefs, Semrush, or GSC data. Every "search volume / KD" below is an **estimate to validate**, not a measurement. What we actually checked is the **SERP landscape** (live searches on 2026-09-18). Before launch, fill in the volume/KD columns in §7 with any keyword tool, then re-rank.

---

## 1. Core findings from the SERP checks

| Keyword | Who ranks now | Takeaway |
|---|---|---|
| does he like me text analyzer | MosaicChats blog, Textin.co homepage, me.bot quiz, SciMatch, Luke's Picks, ChatVisor | A mix of tool pages and blogs. Nobody dominates. Mostly **screenshot/paste tools and quizzes**. Almost none do full-history analysis |
| is he losing interest over text | Quora, MosaicChats, YourTango, relrules, iNexus, herbrilliantfriend, Thought Catalog | **Almost all articles**. Very few tool pages rank. → Best pattern here is a content page with an embedded tool/CTA |
| situationship analyzer | Two App Store apps, base44 mini-site, **Grey Mirror sub-page**, idrlabs quiz, a pile of small sites | Low competition, weak pages. Good to target early |
| WhatsApp relationship analyzer | LoveGraft, MosaicChats, ChatBump, Lucen, App Store apps | Already competitive. **Not a first-wave target**, but still needs a page for tool-intent traffic |
| who texts first calculator | whotextsmore.com (single-purpose tool), plus a lot of noise about WhatsApp's built-in calculator | Clear intent, very few real results → **good free tool entry point** |
| mixed signals text analyzer | Textin /mixed-signals, ChatVisor, a SlideShare list post, plus academic noise | Small, weak results. Good to target early |

**New competitors (not in the BP):** MosaicChats (keeps publishing "2026" blog posts plus tool pages; the most SEO-aggressive), ChatVisor (lots of /tools/ pages), Lucen, whotextsmore, and Grey Mirror's `/grey-mirror/situationship-text-analyzer` sub-pages. These are the SEO opponents to watch.

**Conclusions:**
1. Tool-intent keywords (`* analyzer`) are held by small sites with thin pages. **A full-history analyzer with a real demo has room to win.**
2. Problem keywords (`is he losing interest`, `why is he texting less`) are held by articles. The winning format is **an article that answers the question well, plus an embedded "analyze your whole chat" tool**, not a pure tool page.
3. Nobody currently owns **"when did he change"** or **"the week things changed."** That angle is a gap in the SERPs.

---

## 2. Keyword clusters and page mapping

Priority: **P0** = ships in launch week (7 money pages + 2 tools), **P1** = within 30 days (content pages), **P2** = within 60 days.

### 2.1 Money cluster (tool intent → direct conversion)

| Keyword | Intent | Page | Priority |
|---|---|---|---|
| does he like me text analyzer / analyze texts to see if he likes me | Tool | `/does-he-like-me-text-analyzer` | P0 |
| mixed signals text analyzer / hot and cold texting | Tool + question | `/mixed-signals-text-analyzer` | P0 |
| situationship analyzer / situationship text analyzer | Tool | `/situationship-analyzer` | P0 |
| breadcrumbing test / breadcrumbing text analyzer | Tool + test | `/breadcrumbing-test` | P0 |
| ex text analyzer / why did my ex text me | Tool + question | `/ex-text-analyzer` | P0 |
| whatsapp relationship analyzer / whatsapp chat analyzer relationship | Tool | `/whatsapp-relationship-analyzer` | P0 |
| relationship text analyzer / AI dating text analyzer | Tool (head term) | Homepage `/` | P0 |

### 2.2 Losing-interest cluster (the emotional core, highest conversion potential)

| Keyword | Page | Priority |
|---|---|---|
| is he losing interest / signs he is losing interest over text | `/is-he-losing-interest` (money page) | P0 |
| why is he texting less | `/guides/why-is-he-texting-less` | P1 |
| why are his replies getting shorter | `/guides/why-are-his-replies-getting-shorter` | P1 |
| why did he stop initiating texts | `/guides/he-stopped-initiating-texts` | P1 |
| why is he taking longer to reply | `/guides/why-is-he-taking-longer-to-reply` | P1 |
| signs a guy is pulling away over text | `/guides/signs-hes-pulling-away-over-text` | P1 |

### 2.3 Situationship cluster

| Keyword | Page | Priority |
|---|---|---|
| signs a situationship is ending | `/guides/signs-situationship-is-ending` | P1 |
| is my situationship going nowhere / why won't he commit | `/guides/is-my-situationship-going-anywhere` | P1 |
| does my situationship like me | Merged into `/situationship-analyzer` FAQ | — |

### 2.4 Mixed signals cluster

| Keyword | Page | Priority |
|---|---|---|
| does he like me or want attention | `/guides/does-he-like-me-or-want-attention` | P1 |
| flirting or being friendly | `/guides/is-he-flirting-or-being-friendly` | P1 |
| ghosted or just busy | `/guides/ghosted-or-just-busy` | P1 |

### 2.5 After-date cluster (event-driven, high intent)

| Keyword | Page | Priority |
|---|---|---|
| he texts less after first date / texting after first date | `/guides/he-texts-less-after-first-date` | P1 |
| he went cold after second date | `/guides/he-went-cold-after-second-date` | P2 |
| why did he stop texting after date | Merged into the page above | — |

### 2.6 Free tools (links + top-of-funnel entry points)

| Keyword | Page | Priority |
|---|---|---|
| who texts first calculator / who texts more whatsapp | `/tools/who-texts-first` | P0 |
| reply time calculator / average response time whatsapp | `/tools/reply-time-calculator` | P0 |
| texting effort calculator | `/tools/texting-effort-calculator` | P2 |
| mixed signals decoder (short paste) | Merged into `/mixed-signals-text-analyzer` | — |

**How the free tools work:** They reuse the same browser-side parser. They show only the one requested stat, with no AI and no paywall. Every tool ends with the CTA "Want to know if it's a pattern? See when it changed →", which leads into the full analysis flow.

---

## 3. Launch-week page list (Business Plan §56, Week 4)

- **7 Money Pages:** homepage + the 6 tool pages in §2.1 + `/is-he-losing-interest` (8 in total; the homepage doesn't count toward the 7)
- **2 Free Tools:** who-texts-first, reply-time-calculator
- **10 Content Pages:** the 10 P1 pages from §2.2–2.5 (5 losing interest + 2 situationship + 3 mixed/after-date; trim to 10)

## 4. Money page template (each page needs a distinct intent; swapping the keyword is not enough)

1. H1 = the question itself (e.g. "Is He Losing Interest? Check the Pattern, Not One Text")
2. A 2–3 sentence direct answer (answer first, per current SERP behavior)
3. The analyze-your-chat entry point (question pre-selected for this page)
4. **Sample output specific to this page** (a static screenshot/component of the report module that matches this intent)
5. "What we measure for this question": 3–5 metrics tied to this intent
6. Use cases: 2–3 real scenario descriptions
7. FAQ: 4–6 questions, marked up with FAQPage JSON-LD (it may not produce rich results, but it helps AI Overviews extract answers)
8. Privacy statement + CTA

## 5. Title / meta draft

| Page | Title (≤60) |
|---|---|
| `/` | WhatHeThinks — See When His Texting Changed |
| `/is-he-losing-interest` | Is He Losing Interest? Analyze the Texting Pattern |
| `/does-he-like-me-text-analyzer` | Does He Like Me? Text Analyzer for Your Full Chat |
| `/mixed-signals-text-analyzer` | Mixed Signals Text Analyzer — Words vs. Actions |
| `/situationship-analyzer` | Situationship Analyzer — Is This Going Anywhere? |
| `/breadcrumbing-test` | Breadcrumbing Test — Check His Texts for the Pattern |
| `/ex-text-analyzer` | Ex Text Analyzer — Why Did He Come Back? |
| `/whatsapp-relationship-analyzer` | WhatsApp Relationship Analyzer — Private Chat Report |

## 6. Differentiation wording (used consistently across pages)

- "Don't analyze one text. Analyze the pattern."
- "See the week his texting changed."
- "We analyze his texting behavior — not his mind."
- vs screenshot tools: "Screenshots show a moment. Your chat history shows a pattern."

## 7. To validate before launch (fill in)

| Keyword | Volume (US) | KD | CPC | Notes |
|---|---|---|---|---|
| is he losing interest | ? | ? | ? | |
| does he like me text analyzer | ? | ? | ? | |
| situationship analyzer | ? | ? | ? | |
| mixed signals text analyzer | ? | ? | ? | |
| breadcrumbing test | ? | ? | ? | |
| why is he texting less | ? | ? | ? | |
| who texts first | ? | ? | ? | |
| ex text analyzer | ? | ? | ? | |

Re-ranking rule: KDROI (per the niche-research approach) = volume × commercial intent weight ÷ KD. Move pages with KDROI in the top 5 up to launch week.

## Sources (SERP checks, 2026-09-18)

- https://textin.co/ · https://textin.co/mixed-signals
- https://www.mosaicchats.com/blog/does-he-like-me-text-analysis · https://www.mosaicchats.com/blog/signs-losing-interest-texting · https://www.mosaicchats.com/whatsapp-analyzer
- https://www.chatvisor.ai/tools/dating-text-analyzer · https://www.chatvisor.ai/tools/ai-mix-signals-analyzer
- https://justlay.me/grey-mirror/situationship-text-analyzer
- https://lovegraft.com/ · https://lucen.app/whatsapp-chat-analyzer · https://www.chatbump.ai/en
- https://whotextsmore.com/
- https://inexus.app/blog/signs-he-is-losing-interest-over-text
