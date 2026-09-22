import type { ReportNarrative } from "@/lib/report/types";
import type { MeasuredFact } from "@/lib/report/narrative";

/** Fictional copy for contract and rendering tests; not evidence of live model quality. */
export function narrativeFixture(fact: MeasuredFact): ReportNarrative {
  return {
    language: "en",
    question: "What does the way we talk show about our connection?",
    headline: "Look at shared effort alongside the warmth in the conversation.",
    answer: "The measured pattern gives you something concrete to discuss. It does not settle how he feels, but it can help you explain what you need from this connection.",
    supporting: [{ factId: fact.id, fact: fact.text, interpretation: "This is an observable part of how you share the conversation. It is worth considering alongside the quality of the messages.", confidence: "medium", evidenceIds: fact.evidenceIds.slice(0, 6) }],
    counterEvidence: [],
    counterEvidenceNote: "There is no clear counterexample in the selected evidence for this observation. That does not mean there are no other explanations or that this sample shows the whole relationship.",
    misread: "A reply can show a willingness to talk without telling you whether he will help move a plan forward. Look at what happens after the conversation as well.",
    limitation: "The selected messages cannot show what you discussed in person or what else was happening in his life. A change in texting alone cannot establish a change in feelings.",
    nextStep: {
      question: "What kind of contact would feel good for both of us?",
      why: "This makes room to discuss what you need without asking him to defend a motive that the messages cannot establish.",
      howToAsk: "Choose a calm moment and describe the pattern you have noticed. Give him room to explain what would work for him too.",
      watchFor: "Notice whether you both suggest something practical and follow through. Reassuring words are useful when the pattern afterward also becomes more consistent.",
      responseGuide: "conversation",
    },
  };
}
