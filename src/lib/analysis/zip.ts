/**
 * 从 WhatsApp 导出的 .zip 中提取聊天 txt。
 * 用 filter 只解压 .txt，避免解压压缩包内的媒体文件。
 * 详见 docs/signal-scoring-spec.md §1.2、PRD §5.1。
 */

import { strFromU8, unzipSync } from "fflate";

export function extractChatText(zip: Uint8Array): string {
  const files = unzipSync(zip, {
    filter: (f) => f.name.toLowerCase().endsWith(".txt"),
  });
  const names = Object.keys(files);
  if (names.length === 0) {
    throw new Error("未在 zip 中找到聊天 txt 文件");
  }
  // 优先 _chat.txt（iOS 导出），否则取第一个 txt。
  const pick =
    names.find((n) => n.toLowerCase().endsWith("_chat.txt")) ?? names[0];
  return strFromU8(files[pick]);
}
