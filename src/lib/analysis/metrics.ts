/**
 * §3 指标计算。
 * 思路：先把会话内派生的事件（发起/回复/未答/double-text/词典命中）展开成
 * 带时间戳的事件流，再按 [from,to) 窗口聚合，"全程"与"每周"复用同一逻辑。
 */

import { CONFIG } from "./config";
import { LEX, isDryReply, isQuestion } from "./lexicons";
import type { Role, PersonMetrics, Session } from "./analysis-types";
import type { RoleMsg } from "./sessions";

interface InitEvent {
  role: Role;
  ts: number;
  overnight: boolean;
}
interface ReplyEvent {
  role: Role;
  ts: number;
  latency: number;
}
interface FlagEvent {
  role: Role;
  ts: number;
}
interface QFlagEvent extends FlagEvent {
  wasQuestion: boolean;
}

export interface Events {
  inits: InitEvent[];
  replies: ReplyEvent[];
  unanswered: QFlagEvent[];
  doubleTexts: FlagEvent[];
}

/** 把 session 内消息按 sender 连续分组成 turn。 */
function turnsOf(msgs: RoleMsg[], s: Session): RoleMsg[][] {
  const turns: RoleMsg[][] = [];
  for (let i = s.startIdx; i <= s.endIdx; i++) {
    const m = msgs[i];
    const last = turns[turns.length - 1];
    if (last && last[0].sender === m.sender) last.push(m);
    else turns.push([m]);
  }
  return turns;
}

export function computeEvents(msgs: RoleMsg[], sessions: Session[]): Events {
  const ev: Events = {
    inits: [],
    replies: [],
    unanswered: [],
    doubleTexts: [],
  };

  for (const s of sessions) {
    ev.inits.push({
      role: s.initiator,
      ts: s.startTs,
      overnight: s.isOvernight,
    });

    const turns = turnsOf(msgs, s);
    for (let t = 0; t < turns.length; t++) {
      const turn = turns[t];
      // double text：同一 turn 内相邻消息间隔 ≥30min（会话内必 < SESSION_GAP）
      for (let k = 1; k < turn.length; k++) {
        if (turn[k].ts - turn[k - 1].ts >= CONFIG.DOUBLE_TEXT_MS) {
          ev.doubleTexts.push({ role: turn[k].sender, ts: turn[k].ts });
        }
      }
      const next = turns[t + 1];
      if (next) {
        // 对方回复：latency = 对方 turn 首条 − 本 turn 末条
        ev.replies.push({
          role: next[0].sender,
          ts: next[0].ts,
          latency: next[0].ts - turn[turn.length - 1].ts,
        });
      } else {
        // 会话最后一个 turn 无人回复 → unanswered
        ev.unanswered.push({
          role: turn[0].sender,
          ts: turn[turn.length - 1].ts,
          wasQuestion: turn.some(
            (m) => m.type === "text" && isQuestion(m.text),
          ),
        });
      }
    }
  }
  return ev;
}

function percentileMin(sortedMs: number[], p: number): number {
  if (sortedMs.length === 0) return 0;
  const idx = Math.min(
    sortedMs.length - 1,
    Math.floor(p * (sortedMs.length - 1)),
  );
  return Math.round(sortedMs[idx] / 60000);
}

function emptyMetrics(): PersonMetrics {
  return {
    msgCount: 0,
    textCount: 0,
    words: 0,
    avgLen: 0,
    initiations: 0,
    morningStarts: 0,
    replyLatencies: [],
    replyP50: 0,
    replyP75: 0,
    replyP90: 0,
    unanswered: 0,
    questions: 0,
    questionRatio: 0,
    ignoredQuestions: 0,
    doubleTexts: 0,
    activeDays: 0,
    plansConcrete: 0,
    plansVague: 0,
    plansCancel: 0,
    affection: 0,
    laughter: 0,
    apology: 0,
    support: 0,
    busyExcuse: 0,
    dry: 0,
    conflict: 0,
    hits: {},
  };
}

function inRange(ts: number, from: number, to: number): boolean {
  return ts >= from && ts < to;
}

/**
 * 聚合某时间窗口 [from,to) 内的指标。
 * msgs/events 传全量，用窗口过滤，便于全程与每周复用。
 */
export function aggregate(
  msgs: RoleMsg[],
  ev: Events,
  from: number,
  to: number,
): Record<Role, PersonMetrics> {
  const out: Record<Role, PersonMetrics> = { Y: emptyMetrics(), H: emptyMetrics() };
  const days: Record<Role, Set<string>> = { Y: new Set(), H: new Set() };
  const charLen: Record<Role, number> = { Y: 0, H: 0 };

  const addHit = (m: PersonMetrics, key: string, id: number) => {
    (m.hits[key] ??= []).push(id);
  };

  // 消息级
  for (const msg of msgs) {
    if (!inRange(msg.ts, from, to)) continue;
    const m = out[msg.sender];
    m.msgCount++;
    days[msg.sender].add(new Date(msg.ts).toISOString().slice(0, 10));
    if (msg.type !== "text") continue;
    m.textCount++;
    const words = msg.text.trim().split(/\s+/).filter(Boolean).length;
    m.words += words;
    charLen[msg.sender] += msg.text.length;
    if (isQuestion(msg.text)) m.questions++;

    if (LEX.planProposal.test(msg.text)) {
      // concrete = 同条含 timeWord；否则 vague（§4.1 的近似：不跨消息前看）
      if (LEX.timeWord.test(msg.text)) {
        m.plansConcrete++;
        addHit(m, "planConcrete", msg.id);
      } else {
        m.plansVague++;
        addHit(m, "planVague", msg.id);
      }
    }
    if (LEX.planCancel.test(msg.text)) {
      m.plansCancel++;
      addHit(m, "planCancel", msg.id);
    }
    if (LEX.affection.test(msg.text)) {
      m.affection++;
      addHit(m, "affection", msg.id);
    }
    if (LEX.laughter.test(msg.text)) m.laughter++;
    if (LEX.apology.test(msg.text)) {
      m.apology++;
      addHit(m, "apology", msg.id);
    }
    if (LEX.support.test(msg.text)) {
      m.support++;
      addHit(m, "support", msg.id);
    }
    if (LEX.busyExcuse.test(msg.text)) {
      m.busyExcuse++;
      addHit(m, "busyExcuse", msg.id);
    }
    if (LEX.conflict.test(msg.text)) {
      m.conflict++;
      addHit(m, "conflict", msg.id);
    }
    if (isDryReply(msg.text)) {
      m.dry++;
      addHit(m, "dry", msg.id);
    }
  }

  // 事件级
  for (const e of ev.inits) {
    if (!inRange(e.ts, from, to)) continue;
    if (e.overnight) out[e.role].morningStarts++;
    else out[e.role].initiations++;
  }
  for (const e of ev.replies) {
    if (!inRange(e.ts, from, to)) continue;
    out[e.role].replyLatencies.push(e.latency);
  }
  for (const e of ev.unanswered) {
    if (!inRange(e.ts, from, to)) continue;
    out[e.role].unanswered++;
    if (e.wasQuestion) out[e.role].ignoredQuestions++;
  }
  for (const e of ev.doubleTexts) {
    if (!inRange(e.ts, from, to)) continue;
    out[e.role].doubleTexts++;
  }

  for (const role of ["Y", "H"] as Role[]) {
    const m = out[role];
    const sorted = [...m.replyLatencies].sort((a, b) => a - b);
    m.replyP50 = percentileMin(sorted, 0.5);
    m.replyP75 = percentileMin(sorted, 0.75);
    m.replyP90 = percentileMin(sorted, 0.9);
    m.avgLen = m.textCount ? charLen[role] / m.textCount : 0;
    m.questionRatio = m.textCount ? m.questions / m.textCount : 0;
    m.activeDays = days[role].size;
  }
  return out;
}
