/**
 * 用户进入分析前选择的问题。详见 BP §14、docs/prompt-architecture.md §7。
 */

export const QUESTION_IDS = [
  "likes_me",
  "losing_interest",
  "energy_changed",
  "mixed_signals",
  "more_invested",
  "situationship",
  "ex_came_back",
  "custom",
] as const;

export type QuestionId = (typeof QUESTION_IDS)[number];

export interface Question {
  id: QuestionId;
  label: string;
  /** 卡片副标题：这个问题会重点看什么。 */
  hint: string;
}

export const QUESTIONS: Question[] = [
  { id: "likes_me", label: "Does he actually like me?", hint: "Initiative, curiosity, plans" },
  { id: "losing_interest", label: "Is he losing interest?", hint: "When his effort started dropping" },
  { id: "energy_changed", label: "Why did his energy change?", hint: "The week things shifted" },
  { id: "mixed_signals", label: "Are these mixed signals?", hint: "Where words and actions differ" },
  { id: "more_invested", label: "Who is more invested?", hint: "Who carries the conversation" },
  { id: "situationship", label: "Is this situationship going anywhere?", hint: "Plans and follow-through" },
  { id: "ex_came_back", label: "Why did my ex come back?", hint: "What changed when he returned" },
  { id: "custom", label: "Ask my own question", hint: "We'll keep it in mind" },
];

export function isQuestionId(v: unknown): v is QuestionId {
  return typeof v === "string" && (QUESTION_IDS as readonly string[]).includes(v);
}

export function questionLabel(id: QuestionId, custom?: string | null): string {
  if (id === "custom" && custom) return custom;
  return QUESTIONS.find((q) => q.id === id)?.label ?? "";
}

export const CUSTOM_QUESTION_MAX = 200;
