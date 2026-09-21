/** Topic-specific answers shown before shared report marketing. */
export const SCENARIO_GUIDANCE: Record<string, { heading: string; paragraphs: string[]; checks: string[]; message: string; links: [string, string][] }> = {
  "does-he-like-me-text-analyzer": {
    heading: "How to know if someone likes you: look for a pattern you can discuss",
    paragraphs: ["You cannot know someone's feelings from a single gesture or message. Look for voluntary attention, curiosity about your life and follow-through on plans. In person, notice whether they make room for you and respect your comfort. Warmth, eye contact and teasing can also be friendly, so avoid treating them as proof.", "Over text, useful signs include returning to a topic you mentioned, asking questions that build on your answers and helping make a plan happen. A person who writes briefly may still show care through dependable actions. Someone who sends affectionate paragraphs may not be offering a relationship.", "The clearest next step is a respectful invitation or a direct question. Let the answer matter, including a no. If you use our analyzer, the report focuses on a two-person conversation labeled You and Him; it describes patterns rather than predicting attraction for every possible relationship."],
    checks: ["Does curiosity go both ways, across more than one conversation?", "Do invitations become specific plans, or stay hypothetical?", "Do their actions outside the chat fit what they say?", "Can you express interest without pressure to keep guessing?"],
    message: "I've enjoyed spending time with you. Would you like to go on a date this weekend?",
    links: [["flirting-examples", "Compare friendly and flirty examples"], ["questions-to-ask-your-crush", "Find something natural to ask your crush"]],
  },
  "mixed-signals-text-analyzer": {
    heading: "Mixed signals: when the different parts do not line up",
    paragraphs: ["Mixed signals are behaviors you find difficult to reconcile: affectionate messages followed by repeated avoidance of plans, or enthusiastic time together followed by unclear communication. They can come from different expectations, uncertainty or circumstances you do not see. The pattern does not reveal a motive by itself.", "Separate what happened from what you inferred. ‘He cancelled twice and did not suggest another day’ is an observation. ‘He wants me to chase him’ is an interpretation. A direct question about availability or intentions can be more useful than another week of decoding messages."],
    checks: ["Identify the specific words and actions that seem inconsistent.", "Check whether a stated constraint, such as work or distance, explains the practical issue.", "Ask about the expectation that matters to you: meeting, exclusivity or contact.", "Decide whether the answer and subsequent behavior work for you."],
    message: "You say you'd like to see me, but our plans keep falling through. Do you want to choose a day, or is this not something you want right now?",
    links: [["dating-intentions", "Ask about dating intentions"], ["breadcrumbing", "Understand intermittent attention"]],
  },
  "is-he-losing-interest": {
    heading: "Signs he is losing interest need context",
    paragraphs: ["Less initiation, fewer questions and repeatedly vague plans can make a change in interest feel possible. They can also reflect a stressful period or a change in how you communicate. Compare several aspects of the connection with his own previous behavior, rather than judging him against a universal texting standard.", "A meaningful observation might be that you now start nearly every conversation and he no longer follows up on plans. One slow evening reply is much less informative. Ask about the shift and pay attention to whether you receive clarity and practical follow-through."],
    checks: ["Compare ordinary periods rather than a holiday with a stressful workweek.", "Look beyond speed: does he still return to your questions or suggest meeting?", "Notice whether a change affects calls and time together too.", "State what you have noticed without presenting a conclusion as fact."],
    message: "I've noticed we talk and make plans less often lately. Has something changed for you? I'd rather ask than keep guessing.",
    links: [["dry-texting", "Understand dry texting"], ["texting-styles", "Compare different texting styles"]],
  },
  "situationship-analyzer": {
    heading: "Use the conversation to prepare for clarity",
    paragraphs: ["A situationship analyzer cannot assign a relationship status. It can help you examine who reaches out, whether discussions become plans and how the conversation changes. Those observations may help you explain why the arrangement feels unclear.", "Before analyzing, name the decision you need to make. Are you wondering whether to ask for exclusivity, whether the effort is mutual or whether to stop waiting for a change? The report is supporting context; your shared agreements and your own needs determine the next step."],
    checks: ["Include an ordinary stretch of the conversation, not only the best or worst messages.", "Remember plans and interactions that happened outside text.", "Separate an affectionate message from an actual agreement.", "Ask whether the arrangement available now suits you."],
    message: "I like what we have, but I need to understand whether we're building a relationship or keeping this casual.",
    links: [["situationship", "What a situationship means"], ["situationship-vs-relationship", "Compare a situationship and a relationship"]],
  },
  "breadcrumbing-test": {
    heading: "Breadcrumbing examples: compare attention with action",
    paragraphs: ["Imagine someone returning after a long silence with ‘Miss you,’ then sidestepping every invitation to meet. A repeated cycle like that can leave you waiting for more than the person is offering. A single delayed plan, however, is not enough to establish breadcrumbing.", "Contrast ‘We should hang out sometime’ repeated without action with ‘I can't this week, but I'm free Tuesday.’ The second message offers a concrete alternative. Neither example proves intent; the useful question is whether repeated behavior meets the expectations you have discussed.", "This page provides examples and reflection prompts, not a validated psychological test. A report cannot determine whether someone is deliberately keeping you interested."],
    checks: ["Do warm messages repeatedly arrive without any concrete follow-through?", "Have you clearly asked what the person wants?", "Are expectations mutual, or are you assuming affection means commitment?", "Would you choose this arrangement if it stayed the same?"],
    message: "I enjoy hearing from you, but occasional flirty messages aren't what I'm looking for. Are you interested in making a real plan?",
    links: [["breadcrumbing", "Read the breadcrumbing guide"], ["dating-intentions", "Clarify what each of you wants"]],
  },
  "ex-text-analyzer": {
    heading: "Does my ex want me back, or just want to talk?",
    paragraphs: ["An ex reaching out can mean many things: a practical question, nostalgia, friendship or interest in reconnecting. ‘I miss you’ communicates a feeling in that moment, not necessarily a plan to rebuild the relationship. Ask what they want instead of treating contact as a commitment.", "If reconciliation is discussed, consider what ended the relationship and what has actually changed. A detailed apology and consistent behavior offer different information from a late-night affectionate message. You can choose not to engage, even if the other person sounds sincere."],
    checks: ["Is the purpose of contact clear?", "Do they acknowledge the issues that led to the breakup?", "Are proposed changes concrete and observable?", "Is contact welcome, and are your boundaries respected?"],
    message: "It's good to hear from you. Before we keep talking, are you hoping to catch up as friends or discuss getting back together?",
    links: [["should-i-text-my-ex", "Decide whether contacting your ex makes sense"], ["breadcrumbing", "Recognize recurring on-and-off contact"]],
  },
  "whatsapp-relationship-analyzer": {
    heading: "What a WhatsApp chat analyzer can show",
    paragraphs: ["A WhatsApp export can provide a history of messages with names and timestamps. WhatHeThinks uses supported data to examine conversation starts, typical replies and shifts over time. It can also help organize limited examples of questions, plans and interaction patterns.", "Export without media and upload the supported TXT or ZIP file. Select which participant is You and which is Him, then review the preview. Calls, face-to-face contact and the content of unavailable media may be missing, so a chat report cannot stand in for the whole relationship.", "For other supported messaging platforms, paste messages. Pasted text without timestamps can support a limited content analysis, but not reliable reply-time or long-term trend metrics. The full export is processed on your device; statistics and limited redacted excerpts are sent to create the report."],
    checks: ["Use a two-person conversation and identify participants correctly.", "Include a representative period so an unusual day does not dominate.", "Check whether timestamps and message order were preserved.", "Read the evidence and limitations before drawing a conclusion."],
    message: "A useful question for your report: Has the way we initiate and follow through on plans changed over time?",
    links: [["who-texts-first", "Try the conversation initiation calculator"], ["reply-time-calculator", "Explore typical reply times"], ["texting-styles", "Understand the patterns behind the numbers"]],
  },
};
