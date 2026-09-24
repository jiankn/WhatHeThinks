/// <reference lib="webworker" />
/**
 * 分析 Web Worker：解压 / 解析 / 分析全部在这里完成，避免阻塞 UI。
 * 完整聊天只存在于这个 Worker 的内存中，不会离开浏览器。
 * 详见 docs/PRD.md §5.1–5.2。
 */

import { analyze, mapRoles } from "@/lib/analysis";
import { CONFIG } from "@/lib/analysis/config";
import { parseAny } from "@/lib/analysis/parser";
import { buildWrapped } from "@/lib/analysis/wrapped";
import type { ParseResult } from "@/lib/analysis/types";
import { extractChatText } from "@/lib/analysis/zip";
import type { WorkerIn, WorkerOut, ParseSummary } from "./worker-protocol";

declare const self: DedicatedWorkerGlobalScope;

let rawText = "";
let parsed: ParseResult | null = null;

function post(msg: WorkerOut) {
  self.postMessage(msg);
}

function fail(code: Extract<WorkerOut, { type: "error" }>["code"], message?: string) {
  post({ type: "error", code, message });
}

/** 每个参与者取最近 2 条短文本，帮助用户认出"哪个是我"。只在本地展示。 */
function samples(p: ParseResult): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const names = new Set(p.participants.slice(0, 8).map((x) => x.name));
  for (let i = p.messages.length - 1; i >= 0; i--) {
    const m = p.messages[i];
    if (!names.has(m.sender) || m.type !== "text" || m.text.length > 80) continue;
    const list = (out[m.sender] ??= []);
    if (list.length < 2) list.push(m.text);
  }
  return out;
}

function summarize(p: ParseResult): ParseSummary {
  const n = p.messages.length;
  return {
    participants: p.participants,
    dateOrder: p.dateOrder,
    messageCount: n,
    range: n ? [p.messages[0].ts, p.messages[n - 1].ts] : null,
    hadTimestamps: p.hadTimestamps,
    samples: samples(p),
  };
}

function doParse(opts?: { forceDateOrder?: "MDY" | "DMY" }) {
  parsed = parseAny(rawText, opts);
  if (parsed.messages.length === 0) return fail("no_messages");
  if (parsed.messages.length > CONFIG.MAX_MESSAGES) return fail("too_large");
  if (parsed.participants.length < 2) return fail("one_participant");
  post({ type: "parsed", summary: summarize(parsed) });
}

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;
  try {
    switch (msg.type) {
      case "parseFile": {
        const bytes = new Uint8Array(msg.buf);
        const isZip = msg.name.toLowerCase().endsWith(".zip") || (bytes[0] === 0x50 && bytes[1] === 0x4b);
        if (isZip) {
          try {
            rawText = extractChatText(bytes);
          } catch {
            return fail("zip_no_txt");
          }
        } else {
          rawText = new TextDecoder("utf-8").decode(bytes);
        }
        return doParse();
      }
      case "parseText":
        rawText = msg.text;
        return doParse();
      case "reparse":
        return doParse({ forceDateOrder: msg.dateOrder });
      case "analyze": {
        if (!parsed) return fail("unknown", "Nothing parsed yet");
        const you = parsed.participants.find((p) => p.name === msg.youName);
        const him = parsed.participants.find((p) => p.name === msg.himName);
        if (!you || !him) return fail("unknown", "Participant not found");
        if (you.count + him.count < CONFIG.MIN_MESSAGES) return fail("too_few");
        const analysis = analyze(parsed, msg.youName, msg.himName);
        // 回顾幻灯片只在本地展示，不随报告上传
        const wrapped = buildWrapped(mapRoles(parsed.messages, msg.youName, msg.himName), !parsed.hadTimestamps, [msg.youName, msg.himName]);
        return post({ type: "analyzed", analysis, wrapped });
      }
    }
  } catch (err) {
    fail("unknown", err instanceof Error ? err.message : String(err));
  }
};
