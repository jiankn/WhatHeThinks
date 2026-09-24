/**
 * §9 证据精选。优先转折点与混合信号引用的 msgId（补少量上下文），
 * 再补最近的往来、反复出现的话和开头几条，截断文本，映射为 EvidenceMsg。
 * 预算 ≤120 条，每条 ≤280 字符。
 */

import type {
  EvidenceMsg,
  MixedSignalHit,
  RecurringLine,
  TurningPoint,
} from "./analysis-types";
import type { RoleMsg } from "./sessions";

const BUDGET = 120;
const TAIL = 20;
const HEAD = 12;
const MAX_LEN = 280;

function truncate(text: string): string {
  return text.length <= MAX_LEN ? text : text.slice(0, MAX_LEN - 1) + "…";
}

export function selectEvidence(
  msgs: RoleMsg[],
  turningPoints: TurningPoint[],
  mixed: MixedSignalHit[],
  recurring: RecurringLine[] = [],
): EvidenceMsg[] {
  const byId = new Map(msgs.map((m, i) => [m.id, i]));
  // 按优先级依次加入，预算用完即止；最后按时间排序
  const chosen = new Set<number>();
  const take = (id: number) => {
    const idx = byId.get(id);
    if (idx !== undefined && msgs[idx].type === "text" && chosen.size < BUDGET) chosen.add(id);
  };
  const withContext = (id: number) => {
    const idx = byId.get(id);
    if (idx === undefined) return;
    take(id);
    // 补前后各一条上下文
    if (idx > 0) take(msgs[idx - 1].id);
    if (idx < msgs.length - 1) take(msgs[idx + 1].id);
  };

  for (const tp of turningPoints) tp.evidenceIds.forEach(withContext);
  for (const h of mixed) h.evidenceIds.forEach(withContext);
  // 最近的往来：报告要讲“现在停在哪里”
  msgs.slice(-TAIL).forEach((m) => take(m.id));
  // 反复出现的话：首次与最近的出现
  for (const r of recurring) r.ids.forEach(take);
  // 开头：故事从哪里开始
  msgs.slice(0, HEAD).forEach((m) => take(m.id));

  return [...chosen]
    .map((id) => msgs[byId.get(id)!])
    .sort((a, b) => a.ts - b.ts)
    .map((m) => ({
      id: m.id,
      ts: m.ts,
      sender: m.sender,
      text: truncate(m.text),
    }));
}
