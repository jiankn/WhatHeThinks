import { describe, it, expect } from "vitest";
import { analyzeRoleMsgs } from "@/lib/analysis";
import { buildUpload, redactText, validateUpload, MAX_BODY_BYTES } from "@/lib/report/payload";
import { genChat } from "./synth";

describe("redactText 脱敏", () => {
  it("替换双方名字（大小写不敏感、整词）", () => {
    expect(redactText("hey jake, tell Emma I said hi", "Emma Stone", "Jake 🔥")).toBe(
      "hey [him], tell [you] I said hi",
    );
  });
  it("不替换名字作为其他词的一部分", () => {
    expect(redactText("jakeson is here", "Emma", "Jake")).toBe("jakeson is here");
  });
  it("替换邮箱、电话、链接", () => {
    expect(redactText("mail a@b.com or call +1 (555) 123-4567 see https://x.co/a", "Y", "H")).toBe(
      "mail [email] or call [phone] see [link]",
    );
  });
  it("纯数字显示名（电话号码）不作为名字替换", () => {
    expect(redactText("meet at 5", "Me", "+1 555 1234")).toBe("meet at 5");
  });
});

describe("buildUpload / validateUpload", () => {
  const a = analyzeRoleMsgs(genChat({ weeks: 16, coolAtWeek: 9, seed: 3 }));
  const up = buildUpload(a, { question: "losing_interest", youName: "Emma", himName: "Jake" });

  it("去掉逐条延迟样本，证据 ≤120", () => {
    expect("replyLatencies" in up.analysis.totals.H).toBe(false);
    expect("replyLatencies" in up.analysis.weeks[0].H).toBe(false);
    expect(up.evidence.length).toBeLessThanOrEqual(120);
  });
  it("totals.hits 只保留证据集中的 id", () => {
    const ids = new Set(up.evidence.map((e) => e.id));
    for (const list of Object.values(up.analysis.totals.H.hits ?? {})) {
      expect(list.every((id) => ids.has(id))).toBe(true);
    }
  });
  it("非 custom 问题不带 customQuestion", () => {
    expect(up.customQuestion).toBeUndefined();
  });
  it("通过校验，且体积在上限内", () => {
    expect(validateUpload(up)).toBeNull();
    expect(JSON.stringify(up).length).toBeLessThan(MAX_BODY_BYTES);
  });
  it("拒绝非法问题与超量证据", () => {
    expect(validateUpload({ ...up, question: "nope" })).toMatch(/question/);
    const many = Array.from({ length: 121 }, (_, i) => ({ id: i, ts: 0, sender: "H", text: "x" }));
    expect(validateUpload({ ...up, evidence: many })).toMatch(/evidence/);
    expect(validateUpload({ ...up, evidence: [{ id: 1, ts: 0, sender: "Z", text: "x" }] })).toMatch(/sender/);
  });
});
