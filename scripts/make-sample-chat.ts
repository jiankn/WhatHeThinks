/**
 * 生成一份 iOS 格式的 WhatsApp 导出样例，用于本地手动测试 /analyze。
 * 用法：npx vite-node scripts/make-sample-chat.ts [输出路径] [coolAtWeek]
 */

import { writeFileSync } from "node:fs";
import { genChat } from "../tests/synth";

const out = process.argv[2] ?? "sample-chat.txt";
const coolAt = process.argv[3] ? Number(process.argv[3]) : 9;

const NAMES = { Y: "Emma", H: "Jake 🔥" } as const;

function stamp(ts: number): string {
  const d = new Date(ts);
  const h = d.getUTCHours();
  const h12 = h % 12 || 12;
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${String(d.getUTCFullYear()).slice(2)}`;
  // 真实 iOS 导出在 AM/PM 前用 U+202F 窄空格
  return `[${date}, ${h12}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}\u202f${h < 12 ? "AM" : "PM"}]`;
}

const msgs = genChat({ weeks: 16, coolAtWeek: coolAt, seed: 7 });
const lines = [
  `${stamp(msgs[0].ts - 60_000)} ${NAMES.Y}: \u200eMessages and calls are end-to-end encrypted.`,
  ...msgs.map((m) => `${stamp(m.ts)} ${NAMES[m.sender]}: ${m.text}`),
];
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`wrote ${msgs.length} messages → ${out}`);
