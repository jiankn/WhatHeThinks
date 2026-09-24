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

/** 页面上露出的部分：标题、第一段全文、第二段前若干词（其余在服务器端就截掉）。 */
export interface PublicTeaser { title: string; first: string; next: string }

export function publicTeaser(t: { title: string; opening: string[] }, words = 24): PublicTeaser {
  const rest = t.opening.slice(1).join(" ").split(/\s+/);
  const next = rest.slice(0, words).join(" ") + (rest.length > words ? "…" : "");
  return { title: stripMarkdown(t.title), first: stripMarkdown(t.opening[0]), next: stripMarkdown(next) };
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
