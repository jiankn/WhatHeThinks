import { describe, it, expect } from "vitest";
import { parseWhatsApp, normalize } from "@/lib/analysis/parser";

/** 取某条消息的 UTC 时钟，便于断言（导出无时区，全程按 UTC）。 */
function clock(ts: number) {
  const d = new Date(ts);
  return {
    y: d.getUTCFullYear(),
    mo: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    h: d.getUTCHours(),
    mi: d.getUTCMinutes(),
  };
}

describe("normalize", () => {
  it("去除不可见字符并统一换行", () => {
    const out = normalize("a‎b\r\nc d");
    expect(out).toBe("ab\nc d");
  });
});

describe("iOS 12 小时格式", () => {
  const chat = [
    "[1/15/24, 9:41:05 PM] Jake: hey",
    "[1/15/24, 9:42:10 PM] Mary: hi there",
  ].join("\n");

  it("解析条数、发送者与文本", () => {
    const r = parseWhatsApp(chat);
    expect(r.messages).toHaveLength(2);
    expect(r.messages[0].sender).toBe("Jake");
    expect(r.messages[0].text).toBe("hey");
    expect(r.messages[1].sender).toBe("Mary");
  });

  it("PM 正确转为 24 小时 UTC", () => {
    const r = parseWhatsApp(chat);
    const c = clock(r.messages[0].ts);
    expect(c).toMatchObject({ y: 2024, mo: 1, day: 15, h: 21, mi: 41 });
  });
});

describe("AM/PM 边界", () => {
  it("12:xx AM 视为 0 点，12:xx PM 视为 12 点", () => {
    const chat = [
      "[3/2/24, 12:05:00 AM] A: midnight",
      "[3/2/24, 12:05:00 PM] A: noon",
    ].join("\n");
    const r = parseWhatsApp(chat);
    expect(clock(r.messages[0].ts).h).toBe(0);
    expect(clock(r.messages[1].ts).h).toBe(12);
  });
});

describe("iOS 24 小时格式（点分隔日期）", () => {
  it("解析 [15.01.24, 21:41:05]", () => {
    const chat = "[15.01.24, 21:41:05] Jake: yo";
    const r = parseWhatsApp(chat);
    // 15 > 12 => DMY，日=15 月=01
    expect(r.dateOrder).toBe("DMY");
    expect(clock(r.messages[0].ts)).toMatchObject({
      mo: 1,
      day: 15,
      h: 21,
      mi: 41,
    });
  });
});

describe("Android 12 小时格式", () => {
  it("解析 '1/15/24, 9:41 PM - Name: text'", () => {
    const chat = "1/15/24, 9:41 PM - Jake: hey there";
    const r = parseWhatsApp(chat);
    expect(r.messages[0].sender).toBe("Jake");
    expect(r.messages[0].text).toBe("hey there");
    expect(clock(r.messages[0].ts).h).toBe(21);
  });
});

describe("Android 24 小时格式（四位年份）", () => {
  it("解析 '15/01/2024, 21:41 - Name: text'", () => {
    const chat = "15/01/2024, 21:41 - Mary: hola";
    const r = parseWhatsApp(chat);
    expect(r.dateOrder).toBe("DMY");
    expect(clock(r.messages[0].ts)).toMatchObject({ y: 2024, mo: 1, day: 15 });
  });
});

describe("日期顺序检测", () => {
  it("第一字段出现 >12 => DMY", () => {
    const chat = "13/01/24, 10:00 - A: x";
    expect(parseWhatsApp(chat).dateOrder).toBe("DMY");
  });
  it("第二字段出现 >12 => MDY", () => {
    const chat = "01/13/24, 10:00 - A: x";
    expect(parseWhatsApp(chat).dateOrder).toBe("MDY");
  });
  it("两字段都 ≤12 => ambiguous，默认按 MDY", () => {
    const chat = "01/05/24, 10:00 - A: x";
    const r = parseWhatsApp(chat);
    expect(r.dateOrder).toBe("ambiguous");
    expect(clock(r.messages[0].ts)).toMatchObject({ mo: 1, day: 5 });
  });
});

describe("多行消息", () => {
  it("续行合并到上一条", () => {
    const chat = [
      "[1/1/24, 10:00:00 AM] A: line one",
      "line two",
      "line three",
      "[1/1/24, 10:01:00 AM] B: reply",
    ].join("\n");
    const r = parseWhatsApp(chat);
    expect(r.messages).toHaveLength(2);
    expect(r.messages[0].text).toBe("line one\nline two\nline three");
  });
});

describe("消息类型识别", () => {
  it("media / deleted / call", () => {
    const chat = [
      "[1/1/24, 10:00:00 AM] A: <Media omitted>",
      "[1/1/24, 10:01:00 AM] A: image omitted",
      "[1/1/24, 10:02:00 AM] B: This message was deleted",
      "[1/1/24, 10:03:00 AM] A: Missed voice call",
      "[1/1/24, 10:04:00 AM] B: normal text",
    ].join("\n");
    const r = parseWhatsApp(chat);
    expect(r.messages.map((m) => m.type)).toEqual([
      "media",
      "media",
      "deleted",
      "call",
      "text",
    ]);
  });
});

describe("edited 标记", () => {
  it("去除 <This message was edited> 保留正文", () => {
    const chat = "[1/1/24, 10:00:00 AM] A: real text <This message was edited>";
    const r = parseWhatsApp(chat);
    expect(r.messages[0].type).toBe("text");
    expect(r.messages[0].text).toBe("real text");
  });
});

describe("U+202F 窄空格（iOS 真实导出）", () => {
  it("AM/PM 前的窄空格不影响解析", () => {
    const chat = "[1/15/24, 9:41:05 PM] Jake: hey";
    const r = parseWhatsApp(chat);
    expect(r.messages).toHaveLength(1);
    expect(clock(r.messages[0].ts).h).toBe(21);
  });
});

describe("系统消息", () => {
  it("无 'Name:' 的行被丢弃并计数", () => {
    const chat = [
      "[1/1/24, 10:00:00 AM] Messages and calls are end-to-end encrypted.",
      "[1/1/24, 10:01:00 AM] A: hi",
    ].join("\n");
    const r = parseWhatsApp(chat);
    expect(r.messages).toHaveLength(1);
    expect(r.systemLineCount).toBe(1);
  });
});

describe("群聊（>2 人）", () => {
  it("参与者按消息数降序", () => {
    const chat = [
      "[1/1/24, 10:00:00 AM] A: 1",
      "[1/1/24, 10:01:00 AM] A: 2",
      "[1/1/24, 10:02:00 AM] B: 1",
      "[1/1/24, 10:03:00 AM] C: 1",
      "[1/1/24, 10:04:00 AM] A: 3",
    ].join("\n");
    const r = parseWhatsApp(chat);
    expect(r.participants.map((p) => p.name)).toEqual(["A", "B", "C"]);
    expect(r.participants[0].count).toBe(3);
  });
});

describe("含冒号的正文", () => {
  it("仅在首个 ': ' 处切分，正文冒号保留", () => {
    const chat = "[1/1/24, 10:00:00 AM] A: meet at 9:30 tonight?";
    const r = parseWhatsApp(chat);
    expect(r.messages[0].sender).toBe("A");
    expect(r.messages[0].text).toBe("meet at 9:30 tonight?");
  });
});
