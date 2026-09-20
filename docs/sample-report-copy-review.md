# Sample report copy review

Voice: a careful reader who can point to the messages and help someone start a conversation. No invented inner thoughts, diagnostic labels, pressure to pay, or claims that one reply settles a relationship.

Perspective: the opening question and suggested message use “I”; the analysis addresses the reader as “you”; chat speakers are “You” and “Him”. The fictional sample label remains visible. Feelings are conditional (“if you feel…”), never assigned to the reader as a fact.

## Draft

“The warmth is still there. The initiative has changed.”

“Understand the pattern. Decide your next step.”

“You can want more consistency, even if his reasons are understandable.”

## Humanizer review

- The paired short sentences sound like campaign slogans. Use the situation itself to introduce the report.
- Abstract words such as “initiative” make the reader translate. Say “reaches out.”
- Avoid repeating the same finding under several headings. Each section should answer a different question.
- Keep uncertainty where evidence requires it. Do not soften observable facts with filler.
- Remove dramatic hooks, decorative emojis, em dashes, and statements about what he secretly feels.

## Final copy in the page

“He still texts me. Why does it feel like I'm doing all the work?”

“He's still warm when you talk. He reaches out less often.”

“What does this mean for your next move?”

“You can want more consistency, even when his reasons are understandable.”

The full text lives in `src/app/sample-report/SampleReportStory.tsx`, `src/components/report/NextStepAdvice.tsx`, and `src/components/report/Paywall.tsx`. The sample is explicitly fictional. Statistics are labelled illustrative; excerpts are not presented as the source of the aggregate numbers. The response guidance also appears in purchased reports, with a separate guide for invitations and open conversations. Older reports fall back to the open conversation guide.

## Measurement

`sample_report_view` records the sample visit. `sample_cta_click` records hero, evidence, or footer placement in the existing `content` property. Existing session attribution connects these with `report_created`, `preview_view`, `checkout_click`, and `paid`. Evaluate completed previews and purchases, not clicks alone. No chat text enters these events. Refunds and usefulness feedback require separate evaluation; this change does not add a feedback collection system.
