/**
 * 免费预览钩子的轻量工具（前后端共用，不引入校验依赖）。
 * 生成与校验在 story.ts；这里只有露出哪些文字、如何打码。
 */

/** 去掉模型偶尔写出的 Markdown 强调（*word*、**word**、_word_），页面按纯文本显示。 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*\n]+?)\*\*/g, "$1")
    .replace(/(^|[^\w*])\*([^*\n]+?)\*(?![\w*])/g, "$1$2")
    .replace(/(^|[^\w])_([^_\n]+?)_(?!\w)/g, "$1$2");
}

/** 预览里的一块：正文，或一条原消息（服务器已换好名字、格式化好日期）。 */
export type PublicBlock = { p: string } | { quote: { mine: boolean; text: string; date?: string } };

/** 免费预览列在“报告里还有什么”里的一项。 */
export interface InsideItem { emoji: string; title: string }

/** 页面上露出的部分：标题、开头全文、第一章的前一部分（其余在服务器端就截掉）、报告里还有什么。 */
export interface PublicTeaser {
  title: string;
  opening: string[];
  chapter: { emoji: string; title: string; span: string; blocks: PublicBlock[] } | null;
  inside: InsideItem[];
}

/** 每份故事报告在章节之后都有的部分（与 StorySections 的小节对应）。 */
export const STORY_SECTIONS: InsideItem[] = [
  { emoji: "⚡", title: "The moment that matters most" },
  { emoji: "⚖️", title: "The other honest reading, and how much weight I give it" },
  { emoji: "🧭", title: "My read on your question" },
  { emoji: "🪞", title: "Your side of this" },
  { emoji: "💬", title: "The one message I'd send next, in three versions" },
  { emoji: "🗓️", title: "Your next two weeks, with what to watch for" },
];

const clipWords = (text: string, words: number) => {
  const all = text.split(/\s+/);
  return all.length > words ? `${all.slice(0, words).join(" ")}…` : text;
};

/** 第一章露出的块数：约一半多一点，至少两块；最后露出的一段正文截短，页面上渐隐。 */
export function visibleBlocks(n: number): number {
  return n <= 2 ? n : Math.max(2, Math.ceil(n * 0.55));
}

interface TeaserSource {
  title: string;
  opening: string[];
  outline?: { id: string; emoji: string; title: string }[];
  firstBlocks?: Array<{ p: string } | { quote: number }>;
}

interface TeaserEnv {
  evidence: { id: number; ts: number; sender: "Y" | "H"; text: string }[];
  youName?: string;
  liteMode: boolean;
  /** 第一章的日期范围（服务器按转折点算出）。 */
  firstSpan?: string;
  /** 早期写好的开头没有章节标题时，用预写好的完整报告里的。 */
  fallbackTitles?: string[];
  fmtDate: (ts: number) => string;
}

export function publicTeaser(t: TeaserSource, env: TeaserEnv): PublicTeaser {
  const byId = new Map(env.evidence.map(e => [e.id, e]));
  const show = (text: string) => (env.youName ? text.replace(/\[you\]/g, env.youName) : text);
  const head = t.outline?.[0];
  const all = (t.firstBlocks ?? []).flatMap((b): PublicBlock[] => {
    if ("p" in b) return [{ p: stripMarkdown(b.p) }];
    const e = byId.get(b.quote);
    return e ? [{ quote: { mine: e.sender === "Y", text: show(e.text), ...(env.liteMode ? {} : { date: env.fmtDate(e.ts) }) } }] : [];
  });
  const blocks = all.slice(0, visibleBlocks(all.length));
  const last = blocks.at(-1);
  if (last && "p" in last) blocks[blocks.length - 1] = { p: clipWords(last.p, 28) };
  const chapter = head && blocks.length ? { emoji: head.emoji, title: stripMarkdown(head.title), span: env.firstSpan ?? "", blocks } : null;

  // 没有第一章（早期写好的开头）：最后一段只露出前一部分
  const opening = t.opening.map(stripMarkdown);
  if (!chapter && opening.length > 1) opening[opening.length - 1] = clipWords(opening[opening.length - 1], 24);

  const titles = t.outline?.map(c => ({ emoji: c.emoji, title: stripMarkdown(c.title) }))
    ?? env.fallbackTitles?.map(title => ({ emoji: "📖", title: stripMarkdown(title) })) ?? [];
  const inside = [
    ...(chapter && all.length > blocks.length ? [{ emoji: chapter.emoji, title: `${chapter.title} (the rest of this chapter)` }] : []),
    ...titles.slice(chapter ? 1 : 0),
    ...STORY_SECTIONS,
  ];
  return { title: stripMarkdown(t.title), opening, chapter, inside };
}

/** 打码：保留第一个词，其余字母数字换成 •，标点与空格保留。 */
export function maskText(text: string): string {
  const clipped = text.length > 80 ? `${text.slice(0, 79)}…` : text;
  let first = true;
  return clipped.replace(/[\p{L}\p{N}'’]+/gu, w => {
    if (first) { first = false; return w; }
    return "•".repeat(w.length);
  });
}

/** 免费预览里“锁住的发现”：全部由程序从她的聊天算出，原文在服务器端打码。 */
export interface TeaserFacts {
  youName?: string;
  hisLast?: { date: string; daysAgo: string };
  change?: { date: string; before?: string; afterMasked?: string };
  repeated?: { weeks: string; masked: string };
  chapters: number;
  messages: number;
  liteMode: boolean;
}

export type TeaserStatus = "ready" | "pending" | "none" | "failed" | "unavailable";

/** 完整报告已预先写好时，预览可以露出的部分：章节标题、引用条数、建议消息（只露第一个词）。 */
export interface TeaserReady { chapterTitles: string[]; quotes: number; nextMasked: string }

/** GET/POST /api/reports/:id/teaser 的响应。 */
export interface TeaserData { facts: TeaserFacts; opening: PublicTeaser | null; status: TeaserStatus; ready?: TeaserReady | null }

/** 从写好的故事里取出可露出的部分。 */
export function teaserReady(story: { chapters: { title: string; blocks: Array<{ p: string } | { quote: number }> }[]; nextStep: { question: string } }): TeaserReady {
  return {
    chapterTitles: story.chapters.map(c => stripMarkdown(c.title)),
    quotes: story.chapters.reduce((n, c) => n + c.blocks.filter(b => "quote" in b).length, 0),
    nextMasked: maskText(stripMarkdown(story.nextStep.question)),
  };
}
