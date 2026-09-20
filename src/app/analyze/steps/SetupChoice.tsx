"use client";
import { CHAT_PLATFORMS, type ChatPlatformId } from "@/lib/platforms";
import { QUESTIONS, type QuestionId } from "@/lib/questions";
export function SetupChoice({ kind, question, platform, onQuestion, onPlatform, onContinue }: {
  kind: "focus" | "platform"; question: QuestionId; platform: ChatPlatformId;
  onQuestion: (q: QuestionId) => void; onPlatform: (p: ChatPlatformId) => void; onContinue: () => void;
}) {
  const emojis: Record<string, string> = { overview: "💌", likes_me: "👀", losing_interest: "💔", mixed_signals: "🌀", more_invested: "⚖️", situationship: "💬", ex_came_back: "↩️", energy_changed: "✨" };
  return <section className="v3-setup-choice"><h1>{kind === "focus" ? "What’s on your mind?" : "Where’s the conversation?"}</h1><p>{kind === "focus" ? "Choose a starting point. You can change your focus after the free preview." : "WhatsApp exports give the fullest picture. You can also start with pasted messages."}</p>
    <div className="v3-options">{kind === "focus" ? QUESTIONS.filter(q => q.id !== "custom").map(q => <button key={q.id} className="v3-option" aria-pressed={q.id === question} onClick={() => onQuestion(q.id)}><span className="v3-option-icon" aria-hidden="true">{emojis[q.id]}</span><span><strong>{q.label}</strong><small>{q.hint}</small></span><span className="v3-radio" aria-hidden="true" /></button>) : CHAT_PLATFORMS.map(p => <button key={p.id} className="v3-option" aria-pressed={platform === p.id} onClick={() => onPlatform(p.id)}><img src={p.icon} alt="" width="32" height="32" /><span><strong>{p.name}</strong><small>{p.nativeUpload ? "Upload a TXT or ZIP export" : "Paste messages · no native file import"}</small></span><span className="v3-radio" aria-hidden="true" /></button>)}</div>
    <button className="btn-primary v3-next" onClick={onContinue}>Continue <span aria-hidden="true">→</span></button><p className="v3-fine">Free preview. No account or card required.</p>
  </section>;
}
