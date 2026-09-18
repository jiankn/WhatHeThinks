import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { extractChatText } from "@/lib/analysis/zip";
import { parseWhatsApp } from "@/lib/analysis/parser";

describe("extractChatText", () => {
  it("优先取 _chat.txt", () => {
    const zip = zipSync({
      "_chat.txt": strToU8("[1/1/24, 10:00:00 AM] A: from chat"),
      "other.txt": strToU8("[1/1/24, 10:00:00 AM] A: other"),
    });
    expect(extractChatText(zip)).toContain("from chat");
  });

  it("无 _chat.txt 时取第一个 txt，可继续解析", () => {
    const zip = zipSync({
      "WhatsApp Chat with Jake.txt": strToU8(
        "[1/1/24, 10:00:00 AM] Jake: hey",
      ),
    });
    const r = parseWhatsApp(extractChatText(zip));
    expect(r.messages[0].sender).toBe("Jake");
  });

  it("无 txt 时抛错", () => {
    const zip = zipSync({ "photo.jpg": new Uint8Array([1, 2, 3]) });
    expect(() => extractChatText(zip)).toThrow(/未在 zip/);
  });
});
