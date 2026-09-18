/**
 * §9 证据精选。汇总转折点与混合信号引用的 msgId，补少量上下文，
 * 截断文本，映射为 EvidenceMsg。预算 ≤120 条，每条 ≤280 字符。
 */

import type {
  EvidenceMsg,
  MixedSignalHit,
  TurningPoint,
} from "./analysis-types";
import type { RoleMsg } from "./sessions";

const BUDGET = 120;
const MAX_LEN = 280;

function truncate(text: string): string {
  return text.length <= MAX_LEN ? text : text.slice(0, MAX_LEN - 1) + "…";
}

export function selectEvidence(
  msgs: RoleMsg[],
  turningPoints: TurningPoint[],
  mixed: MixedSignalHit[],
): EvidenceMsg[] {
  const byId = new Map(msgs.map((m, i) => [m.id, i]));
  const chosen = new Set<number>();

  const add = (id: number) => {
    const idx = byId.get(id);
    if (idx === undefined) return;
    chosen.add(id);
    // 补前后各一条上下文
    if (idx > 0) chosen.add(msgs[idx - 1].id);
    if (idx < msgs.length - 1) chosen.add(msgs[idx + 1].id);
  };

  for (const tp of turningPoints) tp.evidenceIds.forEach(add);
  for (const h of mixed) h.evidenceIds.forEach(add);

  return [...chosen]
    .map((id) => msgs[byId.get(id)!])
    .filter((m) => m.type === "text")
    .sort((a, b) => a.ts - b.ts)
    .slice(0, BUDGET)
    .map((m) => ({
      id: m.id,
      ts: m.ts,
      sender: m.sender,
      text: truncate(m.text),
    }));
}
