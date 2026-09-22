"use client";

import { useState } from "react";
import type { FullReport } from "@/lib/report/types";

const guides = {
  plans: [
    ["He picks a day and follows through", "Make the plan if you want to. See whether that effort continues beyond this invitation."],
    ["He is busy, but offers another time", "You have something to work with. Find a time that suits you too."],
    ["He keeps things vague", "If this keeps happening without another suggestion, you can say you need firmer plans and decide how much effort you want to keep putting in."],
    ["He says he doesn't want to take this further", "Take that answer seriously. You can be disappointed and still respect what he has told you."],
  ],
  conversation: [
    ["He answers openly", "Talk about what each of you wants and what would work in practice. You don't have to agree to something that leaves your needs out."],
    ["He needs time to think", "You can agree on when to talk again, if that works for you. A pause doesn't tell you the answer by itself."],
    ["He reassures you, but nothing changes", "Notice whether the same issue keeps coming up. You can explain what you need and reconsider how much you want to invest."],
    ["He wants something different", "Take him at his word. Consider whether what he is offering is a relationship you want to be in."],
  ],
} as const;

/** Shared by the fictional sample and purchased reports, including older saved reports. */
export function NextStepAdvice({ nextStep }: { nextStep: FullReport["nextStep"] & { watchFor?: string } }) {
  const [copyState, setCopyState] = useState("");
  const guide = guides[nextStep.responseGuide === "plans" ? "plans" : "conversation"];

  async function copyQuestion() {
    try {
      await navigator.clipboard.writeText(nextStep.question);
      setCopyState("Question copied.");
    } catch {
      setCopyState("Copy didn't work. You can select the question and copy it yourself.");
    }
  }

  return <div className="reader-next-advice">
    <p>{nextStep.why}</p>
    <blockquote className="reader-question">
      <p>&quot;{nextStep.question}&quot;</p>
      <button type="button" onClick={copyQuestion}>Copy question</button>
    </blockquote>
    <p className="reader-copy-status" role="status">{copyState}</p>
    <p>{nextStep.howToAsk}</p>
    <h3>After you ask</h3>
    {nextStep.watchFor && <p className="reader-lead">{nextStep.watchFor}</p>}
    <p>These are possible responses to consider. Give the conversation some room; a single delayed reply won&apos;t settle it.</p>
    <dl className="reader-response-guide">
      {guide.map(([title, body]) => <div key={title}><dt>{title}</dt><dd>{body}</dd></div>)}
    </dl>
    <p className="reader-next-perspective">You can want more consistency, even when his reasons are understandable.</p>
  </div>;
}
