/**
 * 合成聊天生成器（测试用）。可参数化生成"H 在第 X 周冷却"的数据。
 * 详见 docs/signal-scoring-spec.md §11。
 */

import type { RoleMsg } from "@/lib/analysis/sessions";

const DAY_MS = 24 * 60 * 60 * 1000;
const START = Date.UTC(2024, 0, 1, 0, 0, 0); // 周一

function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const POOL = {
  hWarm: ["miss you", "can't wait to see you", "thinking about you", "you're the best 😍"],
  hPlanConcrete: [
    "wanna grab dinner tomorrow at 7pm?",
    "are you free friday night?",
    "let's do coffee this weekend",
    "come over tonight?",
  ],
  hQuestion: ["how was your day?", "what are you up to?", "how did the meeting go?"],
  hNormal: ["that sounds great", "yeah for sure", "haha totally", "sounds good to me"],
  hDry: ["ok", "yeah", "lol", "k", "nice", "cool"],
  hBusy: ["so busy today", "swamped at work", "long day sorry"],
  yWarm: ["aww miss you too", "can't wait 🥰"],
  yQuestion: ["what about you?", "how are you feeling?", "you around later?"],
  yNormal: ["haha yeah", "sounds good", "okay!", "tell me more"],
} as const;

export interface GenOpts {
  weeks?: number;
  coolAtWeek?: number; // 不设则全程稳定（用于假阳性测试）
  seed?: number;
}

export function genChat(opts: GenOpts = {}): RoleMsg[] {
  const weeks = opts.weeks ?? 12;
  const rng = makeRng(opts.seed ?? 42);
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(rng() * arr.length)];

  const msgs: RoleMsg[] = [];
  let id = 0;

  for (let w = 0; w < weeks; w++) {
    const cooled = opts.coolAtWeek != null && w >= opts.coolAtWeek;
    const hInitProb = cooled ? 0.2 : 0.55;
    const hReplyMin = cooled ? 90 : 6; // H 回复延迟基准（分钟）
    const hWarmProb = cooled ? 0.05 : 0.35;
    const hQProb = cooled ? 0.1 : 0.4;
    const hPlanProb = cooled ? 0.05 : 0.35;
    const hDryProb = cooled ? 0.5 : 0.1;

    for (let day = 0; day < 6; day++) {
      const sessions = 1 + (rng() < 0.5 ? 1 : 0);
      for (let sIdx = 0; sIdx < sessions; sIdx++) {
        // 会话起点：当天某小时
        let ts =
          START +
          w * 7 * DAY_MS +
          day * DAY_MS +
          (10 + Math.floor(rng() * 10)) * 60 * 60 * 1000 +
          sIdx * 3 * 60 * 60 * 1000;

        const initiator: "H" | "Y" = rng() < hInitProb ? "H" : "Y";
        const turns = 3 + Math.floor(rng() * 5);
        let sender = initiator;

        for (let t = 0; t < turns; t++) {
          let text: string;
          if (sender === "H") {
            if (rng() < hDryProb && t > 0) text = pick(POOL.hDry);
            else if (rng() < hWarmProb) text = pick(POOL.hWarm);
            else if (rng() < hPlanProb) text = pick(POOL.hPlanConcrete);
            else if (rng() < hQProb) text = pick(POOL.hQuestion);
            else if (cooled && rng() < 0.2) text = pick(POOL.hBusy);
            else text = pick(POOL.hNormal);
          } else {
            if (rng() < 0.3) text = pick(POOL.yQuestion);
            else if (rng() < 0.2) text = pick(POOL.yWarm);
            else text = pick(POOL.yNormal);
          }

          msgs.push({ id: id++, ts, sender, text, type: "text" });

          // 下一条回复间隔
          const replyBase = sender === "H" ? 4 : hReplyMin; // 对方回复时用对方基准
          const nextSender = sender === "H" ? "Y" : "H";
          const base = nextSender === "H" ? hReplyMin : 4;
          const gapMin = base + Math.floor(rng() * base);
          void replyBase;
          ts += gapMin * 60 * 1000;
          sender = nextSender;
        }
      }
    }
  }

  return msgs.sort((a, b) => a.ts - b.ts);
}
